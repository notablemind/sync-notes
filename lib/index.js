
var utils = require('./utils');

module.exports = Sync;

function Sync(sock, events) {
  this.sock = sock;
  this.events = events;
  this.db = null;
  this.cache = null;
  this.listen();
}

Sync.prototype = {
  listen: function () {
    var self = this
      , sock = this.sock;
    sock.on('connect', function () {
      sock.emit('dump');
    });
    sock.on('dump', function (data) {
      self.db = data;
      self.cache = utils.treeToIds(data);
      self.events.emit('db:changed', self.db);
    });
    // data => the note
    sock.on('change', function (data) {
      var note = self.ids[data.id]
        , parent = self.ids[note.path.slice(-1)[0]]
        , children = parent.data.children
        , idx = children.indexOf(note.data);
      children.splice(idx, 1, data);
      self.ids[data.id].data = data;
      self.events.emit('db:changed');
    });
    // pid, id, index
    sock.on('move', function (data) {
      var parent = self.ids[data.pid]
        , child = self.ids[data.id]
        , idx
        , cpid
        , cparent;
      if (!parent || !child) {
        console.warn('move command received but note not found', data, parent, child);
        return;
      }
      cpid = child.path[child.path.length - 1];
      cparent = self.ids[cpid].data;
      idx = cparent.children.indexOf(child.data);
      if (idx === -1) {
        console.warn('move: child not in parent', child, cparent, data);
        return;
      }
      cparent.children.splice(idx, 1);
      parent.data.children.splice(data.index, 0, child.data);
      child.path = parent.path.concat([data.pid]);
      child.slugPath = parent.slugPath;
      if (parent.data.properties.type === 'major') {
        child.slugPath = child.slugPath.concat([parent.data.properties.slug]);
      }
      self.events.emit('db:changed');
    });
    // pid, index, note == the full object
    sock.on('create', function (data) {
      if (!self.ids[data.pid]) {
        console.warn('create: parent not found', data);
        return;
      }
      var parent = self.ids[data.pid]
        , slugPath = parent.slugPath;
      if (parent.data.properties.type === 'major') {
        slugPath = slugPath.concat([parent.data.properties.slug]);
      }
      self.ids[data.note.properties.id] = {
        path: parent.path.concat([data.pid]),
        slugPath: slugPath,
        parent: data.pid,
        data: data.note
      };
      parent.data.children.splice(data.index, 0, data.note);
      self.events.emit('db:changed');
    });
    // id
    sock.on('delete', function (data) {
      if (!self.ids[data.id]) {
        console.warn('delete: note not found', data);
        return;
      }
      var note = self.ids[data.id]
        , parent = self.ids[note.parent]
        , children = parent.data.children
        , idx = children.indexOf(note.data);
      children.splice(idx, 1);
      note.index = idx;
      self.deleted[data.id] = note;
      delete self.ids[data.id];
      self.events.emit('db:changed');
    });
    // id
    this.events.on('change', function (data) {
      var note = self.ids[data.id];
      self.sock.emit('change', {
        path: note.slugPath,
        note: note.data
      });
    });
    // id, pid, ?index
    this.events.on('move', function (data) {
      var note = self.ids[data.id]
        , parent = self.ids[data.pid];
      if ('undefined' === typeof data.index) {
        data.index = parent.data.children.indexOf(note.data);
        if (data.index === -1) {
          console.warn('got move but child is not in parent', data, note, parent);
          return;
        }
      }
      data.prevpath = note.slugPath;
      note.slugPath = parent.splugPath;
      if (parent.data.properties.type === 'major') {
        note.slugPath = note.slugPath.concat([parent.data.properties.slug]);
      }
      note.path = parent.path.concat([parent.data.properties.id]);
      note.parent = data.pid;
      data.path = note.slugPath;
      // id, pid, index, path, prevpath
      self.sock.emit('move', data);
    });
    // id
    this.events.on('delete', function (data) {
      var note = self.ids[data.id];
      self.sock.emit('delete', {
        id: data.id,
        path: note.slugPath
      });
    });
    // create
    this.events.on('create', function (data) {
      var parent = self.ids[data.pid]
        , note;
      note = self.ids[data.id] = {
        path: parent.path.concat([parent.data.properties.id]),
        slugPath: parent.slugPath,
        data: data.note,
        parent: data.pid
      };
      if (parent.data.properties.type === 'major') {
        note.slugPath = note.slugPath.concat([parent.data.properties.slug]);
      }
      self.sock.emit('create', {
        pid: data.pid,
        note: data.note,
        path: note.slugPath
      });
    });
  }
};
