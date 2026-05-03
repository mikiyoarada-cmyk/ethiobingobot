const users = {};

function isApproved(id){
  return users[id] && users[id].approved === true;
}

module.exports = { users, isApproved };