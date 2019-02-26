const { getMatches } = require('./matchAPI');
const { getRatings } = require('./ratingsAPI');

exports.handler = async (event) => {
  const matches = await getMatches();
  const results = await getRatings(matches);
  const response = {
    statusCode: 200,
    body: JSON.stringify(results),
  }
  return response;
};
