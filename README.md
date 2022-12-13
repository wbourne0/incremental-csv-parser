# Incremental CSV Parser

A fast & lightweight CSV parser with an incremental parsing api.  No
dependencies; browser compatible.  Includes ESM and CJS builds.  All column
values are strings (numbers and dates will **not** automatically be parsed).

Fully compatible with [rfc4180](https://www.ietf.org/rfc/rfc4180.txt).


## Basic parsing

```js
import { parse } from 'incremental-csv-parser';


const results = await parse(`a,b,c,d
1,2,3,4
5,6,7,8
`);

console.log(results);
// [
//   { a: '1', b: '2', c: '3', d: '4' },
//   { a: '5', b: '6', c: '7', d: '8' },
// ]
```

## Incremental parsing

```js
import { CSVParser } from 'incremental-csv-parser';

const results = [];

const parser = new CSVParser((row) => {
  results.push(row);
});

parser.process('a,b,c,d\n');
parser.process('1,2,3,4\n');
console.log(results.shift()); // { a: '1', b: '2', c: '3', d: '4' }
parser.process('5,6,7,8');
parser.flush();
console.log(results.shift()); // { a: '5', b: '6', c: '7', d: '8' }
```

## Typescript support

If column names are known ahead of time, they can be passed in via generics.

```ts
import { CSVParser } from 'incremental-csv-parser';

type ColumnName = 'a' | 'b' | 'c' | 'd';
const results: Array<Record<ColumnName, string>> = [];

const parser = new CSVParser<ColumName>((row) => {
  results.push(row);
});
```

## CSV files without pre-defined headers

Both the `parse` function and `CSVParser` class have an optional second argument
for explicitly providing column names for a csv.

```ts
import { CSVParser } from 'incremental-csv-parser';

const columns = ['a', 'b', 'c', 'd'];

const results = parse(`1,2,3,4
5,6,7,8`, columns);

console.log(results);
// [
//   { a: '1', b: '2', c: '3', d: '4' },
//   { a: '5', b: '6', c: '7', d: '8' },
// ]
```
