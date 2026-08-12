const canModify = (project, userId) => {
  if (project.owner.toString() === userId.toString()) return true;
  const role = project.roles && project.roles.get(userId.toString());
  return role !== "viewer";
};

module.exports = { canModify };
