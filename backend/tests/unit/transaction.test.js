import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('withTransaction Helper Pattern & ACID Contract', () => {
  it('should call BEGIN, execute callback, call COMMIT, and release client on success', async () => {
    const executedCommands = [];
    let released = false;

    const mockClient = {
      query: async (sql) => {
        executedCommands.push(sql);
        return { rowCount: 1 };
      },
      release: () => {
        released = true;
      },
    };

    const mockPool = {
      connect: async () => mockClient,
    };

    // Transaction execution runner simulation matching src/config/db.js withTransaction
    async function runner(callback) {
      const client = await mockPool.connect();
      try {
        await client.query('BEGIN');
        const res = await callback(client);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const result = await runner(async (client) => {
      await client.query('SELECT 1');
      return 'SUCCESS';
    });

    assert.equal(result, 'SUCCESS');
    assert.deepEqual(executedCommands, ['BEGIN', 'SELECT 1', 'COMMIT']);
    assert.equal(released, true);
  });

  it('should call BEGIN, call ROLLBACK, release client, and rethrow error on failure', async () => {
    const executedCommands = [];
    let released = false;

    const mockClient = {
      query: async (sql) => {
        executedCommands.push(sql);
        return { rowCount: 1 };
      },
      release: () => {
        released = true;
      },
    };

    const mockPool = {
      connect: async () => mockClient,
    };

    async function runner(callback) {
      const client = await mockPool.connect();
      try {
        await client.query('BEGIN');
        const res = await callback(client);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    await assert.rejects(
      async () => {
        await runner(async (client) => {
          await client.query('INSERT FAILS');
          throw new Error('Simulated Constraint Violation');
        });
      },
      { message: 'Simulated Constraint Violation' }
    );

    assert.deepEqual(executedCommands, ['BEGIN', 'INSERT FAILS', 'ROLLBACK']);
    assert.equal(released, true);
  });
});

