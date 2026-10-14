/**
 * The Season 1 and Season 2 points readers are gone from the public API.
 *
 * They read `/api/v1/referral-system/season-{1,2}/points/{address}`, which
 * recomputes a total on every request rather than returning the season-end
 * figure. This pins the removal on both entry points that exported them and on
 * the `sdk.api` namespace, so they are not re-exported by accident.
 */

import { describe, expect, it } from 'vitest';

import { ApiNamespace } from '../../../client/ApiNamespace';
import * as apiEntry from '../../../entries/api';
import * as root from '../../../index';

const REMOVED = [
  'getPointsByAddress',
  'getLuxSeason1Points',
  'getLuxSeason2Points',
] as const;

describe('Season 1 and Season 2 points readers', () => {
  it.each(REMOVED)('%s is not exported from the package root', (name) => {
    expect(root).not.toHaveProperty(name);
  });

  it.each(REMOVED)('%s is not exported from the api entry', (name) => {
    expect(apiEntry).not.toHaveProperty(name);
  });

  it('sdk.api has no points method', () => {
    expect(ApiNamespace.prototype).not.toHaveProperty('points');
  });
});
