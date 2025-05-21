import { describe, expect, test } from '@jest/globals';
import type { Factor } from '../types';
import { prepareActiveFactors } from '../lib/teaming';

describe('prepareActiveFactors', () => {
  // Using 'p' as a shorthand for prepareActiveFactors as in the original file
  const p = prepareActiveFactors;

  test('should return an empty array for undefined input', () => {
    expect(p(undefined)).toEqual([]);
  });

  test('should return an empty array for empty input array', () => {
    expect(p([])).toEqual([]);
  });

  test('should filter out ignored factors', () => {
    const factors: Factor[] = [
      { name: 'f1', priority: 'medium', diversity: 0.5, ignored: true, order: 1 },
      { name: 'f2', priority: 'high', diversity: 0.5, ignored: false, order: 2 },
      { name: 'f3', priority: 'low', diversity: 0.5, ignored: true, order: 3 },
      { name: 'f4', priority: 'required', diversity: 0.5, order: 4 }, // ignored is undefined, defaults to false
    ];
    const result = p(factors);
    expect(result.length).toBe(2);
    // Order within priority matters, but here f4 (req) comes before f2 (high) due to priority.
    // The original test was expect(result.map(f => f.name)).toEqual(['f4', 'f2']);
    // This depends on how PRIORITY_WEIGHTS are set up and the sort order.
    // Let's stick to the original expectation based on priority.
    expect(result.map(f => f.name)).toEqual(['f4', 'f2']); 
  });

  test('should sort by priority (required > high > medium > low)', () => {
    const factors: Factor[] = [
      { name: 'low', priority: 'low', diversity: 0.5, order: 4 },
      { name: 'high', priority: 'high', diversity: 0.5, order: 2 },
      { name: 'required', priority: 'required', diversity: 0.5, order: 1 },
      { name: 'medium', priority: 'medium', diversity: 0.5, order: 3 },
    ];
    const result = p(factors);
    expect(result.map(f => f.name)).toEqual(['required', 'high', 'medium', 'low']);
  });

  test('should sort by order within the same priority', () => {
    const factors: Factor[] = [
      { name: 'high2', priority: 'high', diversity: 0.5, order: 2 },
      { name: 'req1', priority: 'required', diversity: 0.5, order: 1 },
      { name: 'high1', priority: 'high', diversity: 0.5, order: 1 },
      { name: 'medNoOrder', priority: 'medium', diversity: 0.5 }, // Undefined order
      { name: 'req2', priority: 'required', diversity: 0.5, order: 2 },
      { name: 'medOrder1', priority: 'medium', diversity: 0.5, order: 1 },
    ];
    const result = p(factors);
    // Expected: req1, req2 (sorted by order), then high1, high2 (sorted by order), 
    // then medNoOrder (order undefined, treated as 0), medOrder1 (order 1).
    // Original test: ['req1', 'req2', 'high1', 'high2', 'medNoOrder', 'medOrder1']
    // Sorting logic: Primary by priority desc, secondary by order asc (undefined order as 0)
    // Required: req1 (1), req2 (2) -> Correct
    // High: high1 (1), high2 (2) -> Correct
    // Medium: medNoOrder (undef -> 0), medOrder1 (1) -> Correct
    expect(result.map(f => f.name)).toEqual(['req1', 'req2', 'high1', 'high2', 'medNoOrder', 'medOrder1']);
  });

  test('should handle undefined order correctly (treated as 0 for sorting)', () => {
    const factors: Factor[] = [
      { name: 'f1', priority: 'high', diversity: 0.5, order: 1 },
      { name: 'f2_no_order', priority: 'high', diversity: 0.5 }, // order undefined
      { name: 'f3_order_0', priority: 'high', diversity: 0.5, order: 0 }, // order explicit 0
    ];
    const result = p(factors);
    // Expected: f2_no_order and f3_order_0 (both effectively order 0) should come before f1 (order 1).
    // Their relative order (f2_no_order vs f3_order_0) might depend on stable sort if not differentiated.
    // Original test: ['f2_no_order', 'f3_order_0', 'f1']
    const highPriorityNames = result.filter(f => f.priority === 'high').map(f => f.name);
    expect(highPriorityNames.indexOf('f2_no_order')).toBeLessThan(highPriorityNames.indexOf('f1'));
    expect(highPriorityNames.indexOf('f3_order_0')).toBeLessThan(highPriorityNames.indexOf('f1'));
    // To be more precise for this case:
    expect(result.map(f => f.name)).toEqual(['f2_no_order', 'f3_order_0', 'f1']);
  });

   test('should maintain original order for factors with same priority and same/undefined order (stability)', () => {
    const factors: Factor[] = [
      { name: 'a_high_no_order', priority: 'high', diversity: 0.5 }, // Undefined order -> 0
      { name: 'b_high_no_order', priority: 'high', diversity: 0.5 }, // Undefined order -> 0
      { name: 'c_high_order_1', priority: 'high', diversity: 0.5, order: 1 },
      { name: 'd_high_no_order', priority: 'high', diversity: 0.5 }, // Undefined order -> 0
    ];
    const result = p(factors);
    // With undefined order defaulting to 0, a_high_no_order, b_high_no_order, d_high_no_order are all effectively order 0.
    // Their relative order should be preserved from the input array due to sort stability for equal elements if the sort is stable.
    // Original: ['a_high_no_order', 'b_high_no_order', 'd_high_no_order', 'c_high_order_1']
    expect(result.map(f => f.name)).toEqual(['a_high_no_order', 'b_high_no_order', 'd_high_no_order', 'c_high_order_1']);
  });
}); 