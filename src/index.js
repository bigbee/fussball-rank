const { rate, Rating, quality, winProbability } = require('ts-trueskill');

const { getMatches } = require('./matchAPI');

const updateRatings = (ratings, matchResults) => {
  const updatedRatings = { ...ratings };
  matchResults.teams.forEach(team => {
    team.ratings.forEach(({ name, rating: [beforeRating, afterRating] }) => {
      updatedRatings[name] = afterRating;
    });
  });
  return updatedRatings;
};

const getTeamNames = ([{ names: team1Names }, { names: team2Names }]) => {
  return [team1Names, team2Names];
};
const getTeamScores = ([{ score: team1Score }, { score: team2Score }]) => {
  return [team1Score, team2Score];
};

const getWinProbability = (team1Ratings, team2Ratings) => {
  return Math.round(winProbability(team1Ratings, team2Ratings) * 100);
};
const getWinProbabilities = (team1Ratings, team2Ratings) => {
  return [
    getWinProbability(team1Ratings, team2Ratings),
    getWinProbability(team2Ratings, team1Ratings),
  ];
};

const getResults = (match, ratings) => {
  const [winnerScore, looserScore] = getTeamScores(match);
  const [winnerTeam, looserTeam] = getTeamNames(match);

  const [winnerRatings, looserRatings] = [
    winnerTeam.map(name => ratings[name] || new Rating()),
    looserTeam.map(name => ratings[name] || new Rating()),
  ];
  const [winnerProbability, looserProbability] = getWinProbabilities(
    winnerRatings,
    looserRatings
  );

  const matchQuality = quality([winnerRatings, looserRatings]);

  // this is probably where we could take score into account
  const winnerWeight = 1;
  const looserWeight = 1;

  const [newWinnerRatings, newLooserRatings] = rate(
    [winnerRatings, looserRatings],
    [0, 1],
    [[winnerWeight, winnerWeight], [looserWeight, looserWeight]]
  );

  return {
    match,
    quality: matchQuality,
    teams: [
      {
        winChance: winnerProbability,
        score: winnerScore,
        ratings: winnerTeam.map((name, i) => ({
          name,
          rating: [winnerRatings[i], newWinnerRatings[i]],
        })),
      },
      {
        winChance: looserProbability,
        score: looserScore,
        ratings: looserTeam.map((name, i) => ({
          name,
          rating: [looserRatings[i], newLooserRatings[i]],
        })),
      },
    ],
  };
};

const ratingsToString = ratings => {
  return Object.keys(ratings)
    .reduce((seed, key) => {
      const rating = ratings[key];
      const ratingString = `${Math.round(rating.mu * 100)} +- ${Math.round(
        rating.sigma * 100
      )}`;
      return [...seed, { name: key, rating: ratingString, mu: rating.mu }];
    }, [])
    .sort(({ mu: a }, { mu: b }) => b - a);
};

const matchResultToString = matchResult => {
  const winnerTeam = matchResult.teams[0];
  const winnerNames = winnerTeam.ratings.map(rating => rating.name);
  const looserTeam = matchResult.teams[1];
  const looserNames = looserTeam.ratings.map(rating => rating.name);

  return `
  *** Match ***
  Teams: ${winnerNames.join(' & ')} (${
    winnerTeam.winChance
  }% chance) vs ${looserNames.join(' & ')} (${looserTeam.winChance}% chance)
  Quality: ${Math.round(matchResult.quality * 100)}%,
  Prediction was: ${winnerTeam.winChance >= 50}
`;
};

const getRatings = async (existingRatings = {}) => {
  const matches = await getMatches();
  // matches.forEach(updateRatings);
  const { results, ratings } = matches.reduce(
    ({ results, ratings }, match) => {
      const matchResult = getResults(match, ratings);
      return {
        results: [...results, matchResult],
        ratings: updateRatings(ratings, matchResult),
      };
    },
    { results: [], ratings: existingRatings }
  );

  const predictions = results.reduce(
    (seed, matchResult) => {
      const winnerTeam = matchResult.teams[0];
      const looserTeam = matchResult.teams[1];

      if (winnerTeam.winChance >= 66) {
        seed.correct = seed.correct + 1;
      } else {
        if (winnerTeam.winChance <= 33) {
          seed.wrong = seed.wrong + 1;
        }
      }
      return seed;
    },
    { correct: 0, wrong: 0 }
  );

  console.log(`
*** Leaderboard ***
${ratingsToString(ratings)
  .map((p, i) => `${i + 1}: ${p.name} (${p.rating})`)
  .join('\n')}

*** Win prediction rate***
${Math.round(
  (predictions.correct / (predictions.wrong + predictions.correct)) * 100
)}% ${predictions.wrong} + ${predictions.correct}
`);
};

getRatings();
