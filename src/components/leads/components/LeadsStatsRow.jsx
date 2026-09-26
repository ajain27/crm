import { SimpleStat } from "../../elements/elements";

export default function LeadsStatsRow({
  showTypeStats,
  residentialCount,
  commercialCount,
  ppcActiveCount,
  ppcDeletedCount,
  pplCount,
}) {
  return (
    <div className="leads-stats-row" data-reveal>
      {showTypeStats && (
        <>
          <SimpleStat
            label="Residential"
            value={residentialCount}
            colorTheme="blue"
          />
          <SimpleStat
            label="Commercial"
            value={commercialCount}
            colorTheme="orange"
          />
        </>
      )}
      {/* PPC counts every lead the campaign produced, including deleted ones. */}
      <SimpleStat
        label="PPC Campaign"
        value={ppcActiveCount + ppcDeletedCount}
        subtitle={ppcActiveCount > 0 ? `${ppcActiveCount} active` : undefined}
        colorTheme="green"
      />
      <SimpleStat
        label="PPL Campaign"
        value={pplCount}
        subtitle={pplCount > 0 ? `${pplCount} active` : undefined}
        colorTheme="blue"
      />
    </div>
  );
}
