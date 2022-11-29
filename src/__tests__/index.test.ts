/* eslint-env jest */
import { expect, describe, it } from '@jest/globals';
import { CSVParser } from '../index';

interface CSVParserTest {
  name: string;
  headers?: Array<string>;
  chunks: Array<string>;
  expected: Array<Record<string, string>>;
  expectedHeaders?: Array<string>;
}

describe('SimpleCSVParser', () => {
  it.each<CSVParserTest>([
    {
      name: 'basic',
      chunks: [
        `a,b,c,d
1,2,3,4
5,6,7,8
`,
      ],
      expected: [
        { a: '1', b: '2', c: '3', d: '4' },
        { a: '5', b: '6', c: '7', d: '8' },
      ],
    },
    {
      name: 'mixed quotes',
      chunks: [
        `a,b,c,"d"
"1",2,"3","4"
5,6,7,8
`,
      ],
      expected: [
        { a: '1', b: '2', c: '3', d: '4' },
        { a: '5', b: '6', c: '7', d: '8' },
      ],
    },
    {
      name: 'quoted newlines',
      chunks: [
        `a,b,c,d
"1
2",3,4,5
`,
      ],
      expected: [{ a: '1\n2', b: '3', c: '4', d: '5' }],
    },
    {
      name: 'empty values',
      chunks: [
        `a,b,c,d
,,,`,
      ],
      expected: [{ a: '', b: '', c: '', d: '' }],
    },
    {
      name: 'carriage returns + newlines',
      chunks: [
        `a,b,c,d\r
1,2,3,4\r
5,6,7,8
`,
      ],
      expected: [
        { a: '1', b: '2', c: '3', d: '4' },
        { a: '5', b: '6', c: '7', d: '8' },
      ],
    },
    {
      name: 'commas in quoted text',
      chunks: [
        `a,b,c,d
"1,2",3,4,5
`,
      ],
      expected: [{ a: '1,2', b: '3', c: '4', d: '5' }],
    },
    {
      name: 'basic chunks',
      chunks: ['a,b,c,d\n', '1,', '2,', '3,', '4\n'],

      expected: [{ a: '1', b: '2', c: '3', d: '4' }],
    },
    {
      name: 'chunks with newlines',
      chunks: ['a,b,c\n', '"1\n', '\n', '\n', '"', ',2,3\n'],
      expected: [{ a: '1\n\n\n', b: '2', c: '3' }],
    },
    {
      name: 'chunks with commas and quotes',
      chunks: ['a,b,c\n', ',', '",,,', '",'],
      expected: [{ a: '', b: ',,,', c: '' }],
    },
    {
      name: 'manually set headers',
      chunks: [
        `1,2,3,4
5,6,7,8`,
      ],
      headers: ['a', 'b', 'c', 'd'],
      expected: [
        { a: '1', b: '2', c: '3', d: '4' },
        { a: '5', b: '6', c: '7', d: '8' },
      ],
    },
    {
      name: 'headers no data',
      chunks: ['a,b,c,d\n'],
      expected: [],
      expectedHeaders: ['a', 'b', 'c', 'd'],
    },
    {
      name: 'headers no data (no newline)',
      chunks: ['a,b,c,d'],
      expected: [],
      expectedHeaders: ['a', 'b', 'c', 'd'],
    },
    {
      name: 'manually defined headers',
      chunks: [],
      expected: [],
      expectedHeaders: ['a', 'b', 'c'],
      headers: ['a', 'b', 'c'],
    }
  ])(
    '$name',
    ({
      chunks,
      expected,
      expectedHeaders = expected.length > 0
        ? Object.keys(expected[0])
        : undefined,
      headers,
    }) => {
      const results: Array<Record<string, string>> = [];

      const parser = new CSVParser((data) => results.push(data), headers);

      for (const chunk of chunks) {
        parser.process(chunk);
      }

      parser.flush();

      expect(results).toEqual(expected);

      if (expectedHeaders) {
        expect(parser.headers()).toEqual(expectedHeaders);
      }
    },
  );
});
