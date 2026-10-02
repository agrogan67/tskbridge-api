const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const ProjectRepository = require('../src/repositories/ProjectRepository');
const ProjectService = require('../src/services/ProjectService');
const {
  DatabaseError,
  ProjectNotFoundError,
  ValidationError
} = require('../src/errors/AppErrors');

describe('ProjectService', () => {
  test('trims validated project fields and forwards tenant ID', async () => {
    let received;
    const service = new ProjectService({
      async create(data, tenantId) {
        received = { data, tenantId };
        return { id: 'project-1', ...data, tenantId };
      }
    });

    const project = await service.create({
      name: '  Homework  ',
      description: '  Monthly work  ',
      teamId: ' team-1 '
    }, 'tenant-1');

    assert.equal(project.name, 'Homework');
    assert.deepEqual(received, {
      data: { name: 'Homework', description: 'Monthly work', teamId: 'team-1' },
      tenantId: 'tenant-1'
    });
  });

  test('rejects invalid create fields before repository access', async () => {
    const service = new ProjectService({ create: async () => assert.fail('repository called') });
    await assert.rejects(
      service.create({ name: '  ', description: 42, teamId: '' }, ''),
      error => error instanceof ValidationError &&
        ['tenantId', 'name', 'description', 'teamId'].every(field => error.fields.includes(field))
    );
  });

  test('validates status and preserves not-found errors', async () => {
    const service = new ProjectService({
      updateStatus: async () => { throw new ProjectNotFoundError(); }
    });

    await assert.rejects(service.updateStatus('p1', 'UNKNOWN', 't1'), ValidationError);
    await assert.rejects(service.updateStatus('p1', 'ACTIVE', 't1'), ProjectNotFoundError);
  });

  test('passes pagination through and returns paginated repository result', async () => {
    const expected = { projects: [{ id: 'p1' }], pagination: { page: 2, limit: 10, total: 11 } };
    let received;
    const service = new ProjectService({
      async findByTeam(teamId, tenantId, options) {
        received = { teamId, tenantId, options };
        return expected;
      }
    });

    assert.equal(await service.getByTeam('team-1', 'tenant-1', { page: 2, limit: 10 }), expected);
    assert.deepEqual(received, {
      teamId: 'team-1',
      tenantId: 'tenant-1',
      options: { page: 2, limit: 10 }
    });
  });

  test('soft deletes and returns a success message', async () => {
    let received;
    const service = new ProjectService({
      async softDelete(id, tenantId) { received = { id, tenantId }; }
    });

    assert.deepEqual(await service.delete('p1', 't1'), { message: 'Project deleted successfully' });
    assert.deepEqual(received, { id: 'p1', tenantId: 't1' });
  });

  test('wraps unexpected repository failures in a safe DatabaseError', async () => {
    const service = new ProjectService({
      create: async () => { throw new Error('sensitive database detail'); }
    });

    await assert.rejects(
      service.create({ name: 'Homework', teamId: 'team-1' }, 'tenant-1'),
      error => error instanceof DatabaseError &&
        error.message === 'Failed to create project'
    );
  });
});

describe('ProjectRepository', () => {
  test('scopes reads and writes to tenant and bounds team page size', async () => {
    const calls = {};
    const model = {
      async findOne(options) {
        calls.findOne = options;
        return { id: 'p1' };
      },
      async findAndCountAll(options) {
        calls.findAndCountAll = options;
        return { rows: [], count: 0 };
      },
      async update(values, options) {
        calls.update = { values, options };
        return [1];
      },
      async destroy(options) {
        calls.destroy = options;
        return 1;
      }
    };
    const repository = new ProjectRepository(model);

    await repository.findById('p1', 't1');
    assert.deepEqual(calls.findOne.where, { id: 'p1', tenantId: 't1' });

    const page = await repository.findByTeam('team-1', 't1', { page: 2, limit: 500 });
    assert.equal(page.pagination.limit, 100);
    assert.deepEqual(calls.findAndCountAll.where, {
      teamId: 'team-1',
      tenantId: 't1',
      status: 'ACTIVE'
    });
    assert.equal(calls.findAndCountAll.offset, 100);

    await repository.updateStatus('p1', 'ACTIVE', 't1');
    assert.deepEqual(calls.update.options.where, { id: 'p1', tenantId: 't1' });
    await repository.softDelete('p1', 't1');
    assert.deepEqual(calls.destroy.where, { id: 'p1', tenantId: 't1' });
  });

  test('rejects missing tenant IDs without querying', async () => {
    const model = {
      findOne: async () => assert.fail('database queried'),
      findAndCountAll: async () => assert.fail('database queried')
    };
    const repository = new ProjectRepository(model);

    await assert.rejects(repository.findById('p1', ''), ValidationError);
    await assert.rejects(repository.findByTeam('team-1', undefined), ValidationError);
  });
});
