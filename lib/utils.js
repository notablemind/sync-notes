
var extend = require('extend');

module.exports = {
  treeToIds: treeToIds
};

function treeToIds(tree) {
  var ret = {};
  tree.children.forEach(function (child) {
    ret[child.properties.id] = {
      parent: null,
      path: [],
      slugPath: [],
      data: child
    };
    var sub = treeToIds(child);
    for (var id in sub) {
      ret[id] = sub[id];
      ret[id].path.unshift(child.properties.id);
      if (ret[id].parent === null) {
        ret[id].parent = child.properties.id;
      }
      if (child.properties.type === 'major') {
        ret[id].slugPath.unshift(child.properties.slug);
      }
    }
  });
  return ret;
}
