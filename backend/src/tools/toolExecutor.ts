import { filterZones }          from "./implementations/filterZones.js";
import { compareSegments }       from "./implementations/compareSegments.js";
import { getTrend }              from "./implementations/getTrend.js";
import { aggregateBy }           from "./implementations/aggregateBy.js";
import { multivariateAnalysis }  from "./implementations/multivariateAnalysis.js";
import { getGrowthZones }        from "./implementations/getGrowthZones.js";

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "filter_zones":          return filterZones(input as unknown as Parameters<typeof filterZones>[0]);
    case "compare_segments":      return compareSegments(input as unknown as Parameters<typeof compareSegments>[0]);
    case "get_trend":             return getTrend(input as unknown as Parameters<typeof getTrend>[0]);
    case "aggregate_by":          return aggregateBy(input as unknown as Parameters<typeof aggregateBy>[0]);
    case "multivariate_analysis": return multivariateAnalysis(input as unknown as Parameters<typeof multivariateAnalysis>[0]);
    case "get_growth_zones":      return getGrowthZones(input as unknown as Parameters<typeof getGrowthZones>[0]);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
