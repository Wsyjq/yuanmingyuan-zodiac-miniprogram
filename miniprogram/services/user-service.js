const { mockUser } = require('../mock/mock-user');

function getProfile() {
  return mockUser;
}

module.exports = {
  getProfile
};
