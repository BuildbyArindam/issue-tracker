'use strict';

const mongoose = require('mongoose');

mongoose.connect(process.env.DB);

const issueSchema = new mongoose.Schema({
  project: { type: String, required: true, index: true },
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_by: { type: String, required: true },
  assigned_to: { type: String, default: '' },
  status_text: { type: String, default: '' },
  open: { type: Boolean, default: true },
  created_on: { type: Date, default: Date.now },
  updated_on: { type: Date, default: Date.now },
});

const Issue = mongoose.model('Issue', issueSchema);

const FIELDS = [
  'issue_title', 'issue_text', 'created_by',
  'assigned_to', 'status_text', 'open',
];

const present = (v) => v !== undefined && v !== null && v !== '';

module.exports = function (app) {
  app.route('/api/issues/:project')

    // ---- READ ----
    .get(async (req, res) => {
      try {
        const filter = { project: req.params.project };
        for (const key of [...FIELDS, '_id', 'created_on', 'updated_on']) {
          const val = req.query[key];
          if (val === undefined) continue;
          if (key === 'open') filter.open = String(val) === 'true';
          else if (key === '_id') {
            if (!mongoose.isValidObjectId(val)) return res.json([]);
            filter._id = val;
          } else filter[key] = val;
        }
        const issues = await Issue.find(filter).select('-project -__v').lean();
        res.json(issues);
      } catch (err) {
        res.json({ error: 'could not fetch issues' });
      }
    })

    // ---- CREATE ----
    .post(async (req, res) => {
      try {
        const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
        if (!present(issue_title) || !present(issue_text) || !present(created_by)) {
          return res.json({ error: 'required field(s) missing' });
        }
        const issue = await Issue.create({
          project: req.params.project,
          issue_title,
          issue_text,
          created_by,
          assigned_to: assigned_to || '',
          status_text: status_text || '',
        });
        res.json({
          _id: issue._id,
          issue_title: issue.issue_title,
          issue_text: issue.issue_text,
          created_by: issue.created_by,
          assigned_to: issue.assigned_to,
          status_text: issue.status_text,
          open: issue.open,
          created_on: issue.created_on,
          updated_on: issue.updated_on,
        });
      } catch (err) {
        res.json({ error: 'required field(s) missing' });
      }
    })

    // ---- UPDATE ----
    .put(async (req, res) => {
      const { _id } = req.body;
      if (!present(_id)) return res.json({ error: 'missing _id' });

      const update = {};
      for (const key of FIELDS) {
        const val = req.body[key];
        if (!present(val)) continue;
        update[key] = key === 'open' ? String(val) === 'true' : val;
      }
      if (Object.keys(update).length === 0) {
        return res.json({ error: 'no update field(s) sent', _id });
      }

      try {
        if (!mongoose.isValidObjectId(_id)) throw new Error('bad id');
        update.updated_on = new Date();
        const doc = await Issue.findOneAndUpdate(
          { _id, project: req.params.project },
          { $set: update },
          { new: true }
        );
        if (!doc) throw new Error('not found');
        res.json({ result: 'successfully updated', _id });
      } catch (err) {
        res.json({ error: 'could not update', _id });
      }
    })

    // ---- DELETE ----
    .delete(async (req, res) => {
      const { _id } = req.body;
      if (!present(_id)) return res.json({ error: 'missing _id' });
      try {
        if (!mongoose.isValidObjectId(_id)) throw new Error('bad id');
        const doc = await Issue.findOneAndDelete({ _id, project: req.params.project });
        if (!doc) throw new Error('not found');
        res.json({ result: 'successfully deleted', _id });
      } catch (err) {
        res.json({ error: 'could not delete', _id });
      }
    });
};
