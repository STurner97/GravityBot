import { createMessages } from './createMessages.js';
import { TEXT_LIMITS } from '../discordLimits.js';

const noSampleProblem = (name) => `uses {${name}}, which has no sample value in the length check`;

// A plural is measured in both forms: `one` is picked when the count is 1.
function valueSets(spec, sampleValues) {
  if (spec.kind !== 'plural') return [sampleValues];
  return [{ ...sampleValues, [spec.countName]: 1 }, sampleValues];
}

function longestRender(text, name, spec, sampleValues) {
  const lengths = valueSets(spec, sampleValues).map(values => text(name, values).length);
  return Math.max(...lengths);
}

// Renders every message that declares where Discord shows it, with the longest value each
// placeholder can take, and reports the ones Discord would refuse. Broken or missing messages
// are checkMessages' to report, so they are skipped here.
export function checkLengths(source, catalog, sampleValues) {
  const { text } = createMessages(source, catalog);
  const problems = [];

  for (const [name, spec] of Object.entries(catalog)) {
    if (!spec.shownAs) continue;
    const limit = TEXT_LIMITS[spec.shownAs];
    if (!limit) throw new Error(`${name} is shown as "${spec.shownAs}", which is not in TEXT_LIMITS`);

    const unsampled = spec.values.find(value => !(value in sampleValues));
    if (unsampled) {
      problems.push({ message: name, problem: noSampleProblem(unsampled) });
      continue;
    }

    let length;
    try {
      length = longestRender(text, name, spec, sampleValues);
    } catch {
      continue;
    }
    if (length > limit.max) {
      problems.push({ message: name, problem: `is ${length} characters; ${limit.label} allows ${limit.max}` });
    }
  }
  return problems;
}
