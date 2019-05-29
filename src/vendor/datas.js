/* eslint-disable no-restricted-syntax */

import {
  coalesce,
  Data as DataImport,
  exists,
  isArray,
  isData as isDataImport,
  isInteger,
  isMany,
  missing,
  splitField,
} from './utils';

const Data = DataImport;
const isData = isDataImport;

/*
return true if a and b are structurally similar
 */
function isEqual(a, b, done = []) {
  if (a === b) {
    return true;
  }

  if (missing(a) && missing(b)) {
    return true;
  }

  if (isData(a) && isData(b)) {
    if (done.includes(a) || done.includes(b)) {
      Data.log.error('recursive structure');
    }

    const moreDone = [a, b, ...done];

    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every(k =>
      isEqual(a[k], b[k], moreDone)
    );
  }

  if (isMany(a) && isMany(b)) {
    if (done.includes(a) || done.includes(b)) {
      Data.log.error('recursive structure');
    }

    return Data.selectFrom(a, b).every((aa, bb) =>
      isEqual(aa, bb, [a, b, ...done])
    );
  }

  return false;
}

/*
RETURN true IF value HAS NO KEYS
 */
Data.isEmpty = value => {
  if (missing(value)) {
    return true;
  }

  if (Data.toPairs(value).some(exists)) {
    return false;
  }

  return true;
};

/*
LIST OF [k, v] TUPLES EXPECTED
OR LIST OF keys AND LIST OF values
*/
Data.zip = (keys, values) => {
  const output = {};

  if (values === undefined) {
    keys.forEach(([k, v]) => {
      // LIST OF [k, v] TUPLES EXPECTED
      output[k] = v;
    });
  } else {
    keys.forEach((k, i) => {
      output[k] = values[i];
    });
  }

  return output;
};

Data.copy = (from, to) => {
  const output = coalesce(to, {});

  Data.toPairs(from).forEach((v, k) => {
    if (exists(v)) {
      output[k] = v;
    }
  });

  return output;
};

/*
Coalesce leaf values
Recursive version of {...argN, ... , ...arg2, ...arg1, ...dest}
notice the reverse-ordering
 */
Data.setDefault = (dest, ...args) => {
  function setDefault(dest, source, path) {
    const output = dest;

    Data.toPairs(source).forEach((sourceValue, key) => {
      const value = output[key];

      if (missing(value)) {
        output[key] = sourceValue;
      } else if (path.indexOf(value) !== -1) {
        Data.log.warning('possible loop');
      } else if (isData(value)) {
        setDefault(value, sourceValue, path.concat([value]));
      }
    });

    return output;
  }

  args.forEach(source => {
    if (missing(source)) {
      return;
    }

    if (missing(dest)) {
      if (isData(source)) {
        return setDefault({}, source, []);
      }

      return source;
    }

    if (isData(dest)) {
      return setDefault(dest, source, []);
    }
  });

  return dest;
};

/*
ASSUME THE DOTS (.) IN path ARE SEPARATORS
AND THE RESULTING LIST IS A PATH INTO THE STRUCTURE
(ESCAPE "." WITH "\\.", IF REQUIRED)
*/
Data.get = (obj, path) => {
  if (missing(obj)) {
    return obj;
  }

  if (path === '.') {
    return obj;
  }

  const pathArray = splitField(path);
  let output = obj;

  for (const step of pathArray) {
    if (isArray(output)) {
      if (step === 'length') {
        output = output.length;
      } else if (isInteger(step)) {
        output = output[step];
      } else if (isArray(output)) {
        output = output.map(o => (isData(o) ? o[step] : null));
      }
    } else if (isData(output)) {
      output = output[step];
    } else {
      return null;
    }

    if (missing(output)) {
      return null;
    }
  }

  return output;
};

/*
Set `obj[path]=value`
where path is dot-delimited path into structure
 */
Data.set = (obj, path, value) => {
  if (missing(obj) || path === '.') {
    Data.log.error('must be given an object and field');
  }

  const split = splitField(path);
  const [last] = split.slice(-1);
  const pathArray = split.slice(0, split.length - 1);
  let o = obj;

  for (const step of pathArray) {
    let val = o[step];

    if (missing(val)) {
      val = {};
      o[step] = val;
    }

    o = val;
  }

  o[last] = value;

  return obj;
};

/*
Append `value` to the multivalue at `obj[path]`
 */
Data.add = (obj, path, value) => {
  if (missing(obj) || path === '.') {
    Data.log.error('must be given an object and field');
  }

  const split = splitField(path);
  const [last] = split.slice(-1);
  const pathArray = split.slice(0, split.length - 1);
  let o = obj;

  for (const step of pathArray) {
    let val = o[step];

    if (missing(val)) {
      val = {};
      o[step] = val;
    }

    o = val;
  }

  const existing = o[last];

  if (missing(existing)) {
    o[last] = value;
  } else if (isArray(existing)) {
    o[last].push(value);
  } else {
    o[last] = [existing, value];
  }

  return obj;
};

/*
We assume dots in property names refer to paths
convert Data from leaf form to standard form

Example:
{"and.everything": 42} => {"and":{"everything":42}}
 */
Data.fromConfig = () => {
  throw new Error('please import vectors to make this work');
};

export { Data, isData, isEqual };
