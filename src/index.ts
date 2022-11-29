export class CSVParser<K extends string> {
  protected _headers?: ReadonlyArray<K>;
  protected _isValueQuoted: boolean = false;
  protected _row: Array<string> = [];
  protected _value: string = '';
  protected _wasLastQuote: boolean = false;
  protected _rowNum = 0;
  protected readonly _writeRow: (data: Record<K, string>) => void;

  constructor(
    /**
     * function called for each row parsed from the csv (header excluded, if not explicitly provided).
     */
    onData: (data: Record<K, string>) => void,
    /**
     * Optional array of column names.  Must be equal to the count of columns in csv.
     *
     * Defaults to the first row read from the csv.
     */
    headers?: ReadonlyArray<K>,
  ) {
    this._headers = headers;
    this._writeRow = onData;
  }

  /**
   * Process a chunk of the csv data.
   * @param chunk input chunk
   * @throws Error in the case of an invalid value
   */
  async process(chunk: string) {
    if (chunk.length === 0) {
      return;
    }

    let sliceStart: number | undefined | null;

    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];

      if (sliceStart == null && this._value.length === 0 && char === '"') {
        this._isValueQuoted = true;
        sliceStart = i + 1;
        continue;
      }

      if (sliceStart == null) {
        sliceStart = i;
      }

      if (this._isValueQuoted) {
        if (this._wasLastQuote) {
          switch (char) {
            case '"':
              // this could return an empty string if the last string ended with `"`
              // and this string started with `"`
              this._value += i === 0 ? '"' : chunk.slice(sliceStart, i);
              break;
            case '\r':
            case '\n':
              this._isValueQuoted = false;
              if (i !== 0) this._value += chunk.slice(sliceStart, i - 1);
              this._finalizeValue(true);
              break;
            case ',':
              this._isValueQuoted = false;
              if (i !== 0) this._value += chunk.slice(sliceStart, i - 1);
              this._finalizeValue();
              break;
            default:
              throw new Error('invalid "');
          }

          this._wasLastQuote = false;
          sliceStart = null;
          continue;
        }

        this._wasLastQuote = char === '"';
        continue;
      }

      if (char === ',') {
        this._value += chunk.slice(sliceStart, i);
        // empty string
        this._finalizeValue();
        sliceStart = null;

        continue;
      }

      if (char === '\n' || char === '\r') {
        // empty string at end of row
        this._value += chunk.slice(sliceStart, i);
        sliceStart = null;
        this._finalizeValue(true);
        continue;
      }

      if (char === '"') {
        // invalid per rfc4180
        throw new Error('Unexpected quote character');
      }
    }

    // write any remaining data (chunk ended either mid-value or we haven't
    // read a terminator yet.
    if (sliceStart != null) {
      this._value += chunk.slice(
        sliceStart,
        this._wasLastQuote ? -1 : chunk.length,
      );
    }
  }

  /**
   * Flushes and validates last row.
   * @throws Error if the stream did not end in a valid row.
   */
  flush() {
    if (!this._value && this._row.length === 0) {
      // clean exit
      return;
    }

    try {
      this._finalizeValue(true);
    } catch (err) {
      throw new Error(`invalid EOF: ${(err as Error).message}`);
    }
  }

  /**
   * Gets headers parsed for the csv.
   * @returns Headers for the csv (or undefined if they haven't been parsed yet)
   */
  headers() {
    return this._headers;
  }

  protected _finalizeValue(rowEnd?: boolean) {
    // empty line
    if (!this._row.length && rowEnd && !this._value) {
      return;
    }

    this._row.push(this._value);
    this._value = '';
    this._wasLastQuote = false;

    if (!rowEnd) {
      return;
    }

    const rowNum = ++this._rowNum;

    if (!this._headers) {
      this._headers = this._row as Array<K>;
      this._row = [];

      return;
    }

    if (this._headers && this._row.length !== this._headers.length) {
      throw new Error(`Invalid count of columns in row ${rowNum}`);
    }

    // @ts-expect-error {} is not assignable to Record<K, string>
    const data: Record<K, string> = {};
    for (let i = 0; i < this._headers.length; i++) {
      data[this._headers[i]] = this._row[i];
    }

    this._writeRow(data);
    this._row = [];
  }
}

export function parse<K extends string>(
  csv: string,
  headers?: ReadonlyArray<K>,
): Array<Record<K, string>> {
  const results: Array<Record<K, string>> = [];
  const parser = new CSVParser<K>((value) => results.push(value), headers);

  parser.process(csv);
  parser.flush();

  return results;
}
