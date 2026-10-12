/**
 * The Season 1 and Season 2 points readers are deprecated, not changed.
 *
 * They read the live `referral-system/season-{1,2}/points` routes, which
 * recompute the total on every request. The deprecation is a JSDoc tag only,
 * so these tests pin two things: the request each reader sends and how it maps
 * the response stay exactly as they were, and every public entry point to them
 * carries `@deprecated` so an editor flags the call site.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLuxSeason1Points,
  getLuxSeason2Points,
  getPointsByAddress,
} from '../../../api-functions/getPointsByAddress/getPointsByAddress';
import { getApiConfig } from '../../../common/api-config';

vi.mock('axios');

const mockedGet = vi.mocked(axios.get);

const ADDRESS = '7Pus5u9UhBjBLkNMTbHdDBdpqH5JLnjmwGFTw2D7eiMa';
const { baseApiUrl } = getApiConfig(Env.prod);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getPointsByAddress', () => {
  it('reads Season 2 from the live route when no season is given', async () => {
    mockedGet.mockResolvedValue({
      data: {
        holding_points: 10,
        protocol_points: 5,
        referee_points: 1,
        referrals_points: 2,
        total: 20,
        badge_points: 1.5,
        checkin_points: 0.5,
        protocol_points_map: { vault: '5' },
      },
    });

    const points = await getPointsByAddress({
      address: ADDRESS,
      env: Env.prod,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      `${baseApiUrl}/api/v1/referral-system/season-2/points/${ADDRESS}`,
    );
    expect(points).toEqual({
      holdingPoints: 10,
      protocolPoints: 5,
      referralPoints: 2,
      refereePoints: 1,
      badgesPoints: 1.5,
      checkinPoints: 0.5,
      totalPoints: 20,
      protocolPointsBreakdown: { vault: 5 },
      totalWithoutBadgesPoints: 20,
    });
  });

  it('reads Season 1 from the live route and keeps the address case', async () => {
    mockedGet.mockResolvedValue({
      data: {
        holding_points: 23.43,
        total: 23.43,
        total_without_badges: 23.43,
        protocol_points_map: { 'lombard-holding-points-sol': 23.43 },
      },
    });

    const points = await getLuxSeason1Points({
      address: ADDRESS,
      env: Env.prod,
    });

    expect(mockedGet).toHaveBeenCalledWith(
      `${baseApiUrl}/api/v1/referral-system/season-1/points/${ADDRESS}`,
    );
    expect(points.totalPoints).toBe(23.43);
    expect(points.holdingPoints).toBe(23.43);
    expect(points.referralPoints).toBe(0);
    expect(points.protocolPointsBreakdown).toEqual({
      'lombard-holding-points-sol': 23.43,
    });
  });

  it('routes the Season 2 wrapper to the Season 2 route', async () => {
    mockedGet.mockResolvedValue({ data: { total: 1 } });

    await getLuxSeason2Points({ address: ADDRESS, env: Env.prod });

    expect(mockedGet).toHaveBeenCalledWith(
      `${baseApiUrl}/api/v1/referral-system/season-2/points/${ADDRESS}`,
    );
  });
});

/** JSDoc tag names on every declaration of `name` in the file, in order. */
function tagsOn(file: string, name: string): string[][] {
  const path = resolve(__dirname, '../../..', file);
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[][] = [];
  const visit = (node: ts.Node) => {
    const declared =
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name?.getText(source) === name
        ? node
        : ts.isVariableStatement(node) &&
            node.declarationList.declarations.some(
              (d) => d.name.getText(source) === name,
            )
          ? node
          : undefined;
    if (declared) {
      found.push(ts.getJSDocTags(declared).map((t) => t.tagName.text));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('deprecation', () => {
  const POINTS = 'api-functions/getPointsByAddress/getPointsByAddress.ts';

  it('tags every overload of getPointsByAddress', () => {
    // Three overload signatures; the implementation signature is not visible to callers.
    const [s1, s2, any, implementation] = tagsOn(POINTS, 'getPointsByAddress');
    expect(s1).toContain('deprecated');
    expect(s2).toContain('deprecated');
    expect(any).toContain('deprecated');
    expect(implementation).toBeDefined();
  });

  it.each(['getLuxSeason1Points', 'getLuxSeason2Points'])('tags %s', (name) => {
    const [declaration] = tagsOn(POINTS, name);
    expect(declaration).toContain('deprecated');
  });

  it('tags every overload of sdk.api.points', () => {
    const [s1, s2, any] = tagsOn('client/ApiNamespace.ts', 'points');
    expect(s1).toContain('deprecated');
    expect(s2).toContain('deprecated');
    expect(any).toContain('deprecated');
  });
});
