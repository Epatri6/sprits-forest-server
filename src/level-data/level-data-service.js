const LevelDataService = {
  getLevels(db) {
    return db('level_data').select('*');
  },

  getLevel(db) {
    return db('level_data')
      .count('*')
      .then((numLevels) => {
        return db('level_data').select('*').where({id: Math.floor(numLevels[0].count * Math.random()) + 1}).first();
      });
  },
};

module.exports = LevelDataService;
