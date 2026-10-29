import { HomeOutlined } from '@ant-design/icons';
import { describe, expect, it } from 'vitest';
import {
  type NavigationItem,
  type NavigationSection,
  visibleNavigationItems,
  visibleNavigationSections,
} from '../navigation';

const items: NavigationItem[] = [
  { path: '/', labelKey: 'navigation.dashboard', icon: HomeOutlined },
  {
    path: '/users',
    labelKey: 'navigation.dashboard',
    icon: HomeOutlined,
    ability: { action: 'READ', subject: 'USER' },
  },
];

describe('visibleNavigationItems', () => {
  it('keeps items without an ability and items the user is granted', () => {
    expect(
      visibleNavigationItems(items, [{ action: 'READ', subject: 'USER' }]).map(
        ({ path }) => path,
      ),
    ).toEqual(['/', '/users']);
  });

  it('hides items whose ability the user lacks', () => {
    expect(
      visibleNavigationItems(items, [{ action: 'READ', subject: 'ROLE' }]).map(
        ({ path }) => path,
      ),
    ).toEqual(['/']);
  });
});

describe('visibleNavigationSections', () => {
  const sections: NavigationSection[] = [
    { labelKey: 'navigationSections.finances', items: [items[0]] },
    { labelKey: 'navigationSections.administration', items: [items[1]] },
  ];

  it('keeps sections with at least one visible item', () => {
    expect(
      visibleNavigationSections(sections, [
        { action: 'READ', subject: 'USER' },
      ]).map(({ labelKey, items }) => [labelKey, items.length]),
    ).toEqual([
      ['navigationSections.finances', 1],
      ['navigationSections.administration', 1],
    ]);
  });

  it('hides sections whose items are all hidden', () => {
    expect(
      visibleNavigationSections(sections, []).map(({ labelKey }) => labelKey),
    ).toEqual(['navigationSections.finances']);
  });
});
