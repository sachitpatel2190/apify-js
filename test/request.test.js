import util from 'util';
import { normalizeUrl } from '@apify/utilities';
import { hashPayload } from '../build/request';
import Apify from '../build/index';

describe('Apify.Request', () => {
    test('should not accept invalid values', () => {
        expect(() => new Apify.Request({ url: 1 })).toThrowError();
        expect(() => new Apify.Request({ url: 'https://apify.com' })).not.toThrowError();
        expect(() => new Apify.Request({ url: 'https://apify.com', method: 1 })).toThrowError();
        expect(() => new Apify.Request({ url: 'https://apify.com', headers: 'x' })).toThrowError();
        expect(() => new Apify.Request({ url: 'https://apify.com', foo: 'invalid-property' })).toThrowError();
    });

    test('should create unique key based on url for GET requests', () => {
        const url = 'https://user:pass@website.com/a/vb/c /d?q=1&q=kjnjkn$lkn#lkmlkml';
        const normalizedUrl = normalizeUrl(url);
        const request = new Apify.Request({ url });

        expect(request.uniqueKey).toEqual(normalizedUrl);
        expect(request.uniqueKey).not.toEqual(request.url);
    });

    test('should create unique key based on url, method and payload for POST requests', () => {
        const url = 'https://user:pass@website.com/a/vb/c /d?q=1&q=kjnjkn$lkn#lkmlkml';
        const payload = JSON.stringify({ foo: 'bar' });
        const payloadHash = hashPayload(payload);
        const normalizedUrl = normalizeUrl(url);
        const request = new Apify.Request({ url, method: 'post', payload, useExtendedUniqueKey: true });

        const uniqueKey = `POST(${payloadHash}):${normalizedUrl}`;

        expect(request.uniqueKey).toEqual(uniqueKey);
    });

    test('works', () => {
        const data = {
            id: '123',
            url: 'http://www.example.com',
            uniqueKey: 'uniq',
            method: 'POST',
            payload: 'Some payload',
            noRetry: true,
            retryCount: 1,
            errorMessages: [
                'Something bad',
            ],
            headers: {
                Test: 'Bla',
            },
            userData: {
                yo: 123,
            },
            handledAt: new Date(),
        };
        expect(new Apify.Request(data)).toMatchObject(data);

        data.handledAt = (new Date()).toISOString();
        expect((new Apify.Request(data)).handledAt).toBeInstanceOf(Date);
    });

    test('should allow to push error messages', () => {
        const request = new Apify.Request({ url: 'http://example.com' });

        expect(request.errorMessages).toEqual([]);

        // Make a circular, unstringifiable object.
        const circularObj = { prop: 1 };
        circularObj.obj = circularObj;
        const circularObjInspect = util.inspect(circularObj);

        const obj = { one: 1, two: 'two' };
        const objInspect = util.inspect(obj);

        const toStr = {
            toString() {
                return 'toString';
            },
        };

        request.pushErrorMessage(undefined);
        request.pushErrorMessage(false);
        request.pushErrorMessage(5);
        request.pushErrorMessage(() => 2);
        request.pushErrorMessage('bar');
        request.pushErrorMessage(Symbol('A Symbol'));
        request.pushErrorMessage(null);
        request.pushErrorMessage(new Error('foo'), { omitStack: true });
        request.pushErrorMessage({ message: 'A message.' });
        request.pushErrorMessage([1, 2, 3]);
        request.pushErrorMessage(obj);
        request.pushErrorMessage(toStr);
        request.pushErrorMessage(circularObj);

        expect(request.errorMessages).toEqual([
            'undefined',
            'false',
            '5',
            '() => 2',
            'bar',
            'Symbol(A Symbol)',
            'null',
            'foo',
            'A message.',
            '1,2,3',
            objInspect,
            'toString',
            circularObjInspect,
        ]);

        request.pushErrorMessage(new Error('error message.'));
        const last = request.errorMessages.pop();
        expect(last).toMatch('error message.');
        expect(last).toMatch(' at ');
        expect(last).toMatch(__filename.split(/[\\/]/g).pop());
    });

    test('should not allow to have a GET request with payload', () => {
        expect(() => new Apify.Request({ url: 'http://example.com', payload: 'foo' })).toThrowError();
        expect(() => new Apify.Request({ url: 'http://example.com', payload: 'foo', method: 'POST' })).not.toThrowError();
    });

    // TODO would be nice to have a test like this, but it's flaky in CI so I'm disabling it.
    // Keeping it here to run it manually once in a while.
    test.skip('should have acceptable request creation time', () => {
        const requests = [];
        const start = Date.now();
        for (let i = 0; i < 1000; i++) requests.push(new Apify.Request({ url: `https://example.com/${i}` }));
        const durationMillis = Date.now() - start;
        // Under normal load, the Requests are created in ~25-30ms
        // In tests the load is high, so we only check if it doesn't
        // overshoot some crazy range like 500ms.
        expect(durationMillis).toBeLessThan(500);
    });
});
