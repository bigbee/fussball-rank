const chalk = require('chalk');

const { getMatches } = require('fussball-lambda/matchAPI');
const { getRatings } = require('fussball-lambda/ratingsAPI');

const fromMu = mu => {
  return Math.round(mu * 100);
};

const ratingsToString = ratings => {
  return Object.keys(ratings)
    .reduce((seed, key) => {
      const rating = ratings[key];
      const displayRating = fromMu(rating.mu);
      const uncertaintyPercent = fromMu(rating.sigma / rating.mu);
      const ratingString = `${displayRating} +-${uncertaintyPercent}%`;
      return [
        ...seed,
        {
          name: key,
          rating: ratingString,
          mu: rating.mu,
          pessimisticMu: rating.mu - rating.sigma,
        },
      ];
    }, [])
    .sort(({ pessimisticMu: aMu }, { pessimisticMu: bMu }) => bMu - aMu);
};

const resultsToString = r => {
  const [{ score: t1Score }, { score: t2Score }] = r.teams;
  const [t1Names, t2Names] = r.teams.map(t =>
    t.ratings.map(r => r.name).join(' & ')
  );

  return `${chalk.green(t1Names)} (${t1Score}) vs (${t2Score}) ${chalk.red(t2Names)}
  - Estimated win chance: ${r.teams[0].winChance}%
  - Match quality: ${Math.round(r.quality * 100)}%
  - Rating changes:
${r.teams
  .map(team => {
    return team.ratings
      .map(
        ({ name, rating: [fromRating, toRating] }) =>
          `      ${name}: Δ=${fromMu(toRating.mu - fromRating.mu)}`
      )
      .join('\n');
  })
  .join('\n')}
`;
};

const main = async () => {
  const matches = await getMatches();
  const { results, predictions, ratings } = await getRatings(matches);

  const topUnexpectedMatch = [...results].sort((a, b) => {
    return a.teams[0].winChance - b.teams[0].winChance;
  })[0];
  console.log(`
${chalk.black.bgCyan('************************ Most unexpected win ************************')}
${resultsToString(topUnexpectedMatch)}
`);

  console.log(chalk.black.bgCyan('************************ Last 3 matches ************************'));
  results.slice(-3).forEach(r => {
    console.log(resultsToString(r));
  });

  console.log(`
${chalk.black.bgCyan('************************ Leaderboard ************************')}
${ratingsToString(ratings)
  .map((p, i) => `${i + 1}: ${p.name} (${p.rating})`)
  .join('\n')}

${chalk.black.bgCyan('************************ Win prediction rate************************')}
${Math.round(
  (predictions.correct / (predictions.wrong + predictions.correct)) * 100
)}% ${predictions.wrong} wrong + ${predictions.correct} correct
`);
};

main();
