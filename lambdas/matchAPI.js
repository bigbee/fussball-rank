const GoogleSpreadsheet = require('google-spreadsheet');
const credentials = require('./creds.json');
const spreadsheetKey = '1rEYm48GNdWOODhQOCNDyid_J5NkvHXLfQKd42-wiv9k';

const getDoc = async (key, creds) => {
  const doc = new GoogleSpreadsheet(key);

  await new Promise((resolve, reject) => {
    doc.useServiceAccountAuth(creds, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
  return doc;
};

const getSheet = async (doc, index) => {
  const info = await new Promise((resolve, reject) => {
    doc.getInfo((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
  const sheet = info.worksheets[index];
  // console.log(sheet);
  return sheet;
};

const MATCH_ROWS = {
  offset: 0,
  // limit: Number.MAX_SAFE_INTEGER,
};

const getRows = async sheet => {
  return new Promise((resolve, reject) => {
    sheet.getRows(MATCH_ROWS, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const getMatches = async () => {
  const doc = await getDoc(spreadsheetKey, credentials);

  const sheet = await getSheet(doc, 4);
  const rows = await getRows(sheet);

  return rows.map(
    ({ t1defender, t1attacker, t2defender, t2attacker, t1score, t2score }) => {
      const team1Names = [t1attacker, t1defender];
      const team2Names = [t2attacker, t2defender];
      
      const team1 = { names: team1Names, score: Number.parseInt(t1score) };
      const team2 = { names: team2Names, score: Number.parseInt(t2score) };

      return team1.score > team2.score
        ? [team1, team2]
        : [team2, team1];
    }
  );
};

exports.getMatches = getMatches;
