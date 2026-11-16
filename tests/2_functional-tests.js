const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

const PATH = '/api/issues/apitest';
const PROJECT_FILTER = '/api/issues/filtertest';

suite('Functional Tests', function () {
  this.timeout(5000);

  let id1, id2;

  suite('POST /api/issues/{project}', function () {
    test('Create an issue with every field', function (done) {
      chai.request(server).post(PATH)
        .send({
          issue_title: 'Title',
          issue_text: 'text',
          created_by: 'Functional Test - Every field filled in',
          assigned_to: 'Chai and Mocha',
          status_text: 'In QA',
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.issue_title, 'Title');
          assert.equal(res.body.issue_text, 'text');
          assert.equal(res.body.created_by, 'Functional Test - Every field filled in');
          assert.equal(res.body.assigned_to, 'Chai and Mocha');
          assert.equal(res.body.status_text, 'In QA');
          assert.isTrue(res.body.open);
          assert.property(res.body, 'created_on');
          assert.property(res.body, 'updated_on');
          assert.property(res.body, '_id');
          id1 = res.body._id;
          done();
        });
    });

    test('Create an issue with only required fields', function (done) {
      chai.request(server).post(PATH)
        .send({
          issue_title: 'Title 2',
          issue_text: 'text 2',
          created_by: 'Functional Test - Required fields only',
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.issue_title, 'Title 2');
          assert.equal(res.body.assigned_to, '');
          assert.equal(res.body.status_text, '');
          assert.isTrue(res.body.open);
          assert.property(res.body, '_id');
          id2 = res.body._id;
          done();
        });
    });

    test('Create an issue with missing required fields', function (done) {
      chai.request(server).post(PATH)
        .send({ issue_title: 'Only a title' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'required field(s) missing' });
          done();
        });
    });
  });

  suite('GET /api/issues/{project}', function () {
    test('View issues on a project', function (done) {
      chai.request(server).get(PATH)
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 2);
          [
            'issue_title', 'issue_text', 'created_by', 'assigned_to',
            'status_text', 'open', 'created_on', 'updated_on', '_id',
          ].forEach((p) => assert.property(res.body[0], p));
          done();
        });
    });

    test('View issues on a project with one filter', function (done) {
      chai.request(server).get(PATH + '?created_by=Functional Test - Required fields only')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 1);
          res.body.forEach((i) =>
            assert.equal(i.created_by, 'Functional Test - Required fields only'));
          done();
        });
    });

    test('View issues on a project with multiple filters', function (done) {
      chai.request(server).get(PATH + '?open=true&issue_title=Title')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 1);
          res.body.forEach((i) => {
            assert.isTrue(i.open);
            assert.equal(i.issue_title, 'Title');
          });
          done();
        });
    });
  });

  suite('PUT /api/issues/{project}', function () {
    test('Update one field on an issue', function (done) {
      chai.request(server).put(PATH)
        .send({ _id: id1, issue_text: 'updated text' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { result: 'successfully updated', _id: id1 });
          done();
        });
    });

    test('Update multiple fields on an issue', function (done) {
      chai.request(server).put(PATH)
        .send({ _id: id1, issue_title: 'new title', assigned_to: 'someone', open: false })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { result: 'successfully updated', _id: id1 });
          done();
        });
    });

    test('Update an issue with missing _id', function (done) {
      chai.request(server).put(PATH)
        .send({ issue_title: 'no id' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'missing _id' });
          done();
        });
    });

    test('Update an issue with no fields to update', function (done) {
      chai.request(server).put(PATH)
        .send({ _id: id1 })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'no update field(s) sent', _id: id1 });
          done();
        });
    });

    test('Update an issue with an invalid _id', function (done) {
      chai.request(server).put(PATH)
        .send({ _id: 'invalidid123', issue_title: 'x' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'could not update', _id: 'invalidid123' });
          done();
        });
    });
  });

  suite('DELETE /api/issues/{project}', function () {
    test('Delete an issue', function (done) {
      chai.request(server).delete(PATH)
        .send({ _id: id1 })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { result: 'successfully deleted', _id: id1 });
          // cleanup second issue
          chai.request(server).delete(PATH).send({ _id: id2 }).end(() => done());
        });
    });

    test('Delete an issue with an invalid _id', function (done) {
      chai.request(server).delete(PATH)
        .send({ _id: 'invalidid123' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'could not delete', _id: 'invalidid123' });
          done();
        });
    });

    test('Delete an issue with missing _id', function (done) {
      chai.request(server).delete(PATH)
        .send({})
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: 'missing _id' });
          done();
        });
    });
  });
});
