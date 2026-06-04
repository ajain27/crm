import { Home, DollarSign, TrendingUp, Users } from "lucide-react";
import { SimpleStat } from "../elements/elements";
import { currency } from "../../utils/utils";

export default function RentalStatsGrid({
  propertiesCount,
  totalRent,
  totalMortgage,
  netCashflow,
  section8Count,
  regularCount,
  totalRentAllProperties,
  netCashflowAllProperties,
  accumulatedRentCollected,
  statsSubtitle,
}) {
  return (
    <section
      className="stats-grid"
      data-reveal-group
      style={{ "--reveal-delay": "60ms" }}
    >
      <SimpleStat
        icon={<Home size={20} />}
        label="Properties"
        subtitle={statsSubtitle}
        value={propertiesCount}
        colorTheme="green"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label="Monthly Rent"
        subtitle={statsSubtitle}
        numericValue={totalRent}
        format={currency}
        colorTheme="green"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label="Monthly Mortgage"
        subtitle={statsSubtitle}
        numericValue={totalMortgage}
        format={currency}
        colorTheme="orange"
      />
      <SimpleStat
        icon={<TrendingUp size={20} />}
        label="Net Cashflow"
        subtitle="Rent − mortgage"
        numericValue={netCashflow}
        format={currency}
        colorTheme={netCashflow < 0 ? "red" : "green"}
        valueClassName={netCashflow < 0 ? "rm-negative" : undefined}
      />
      <SimpleStat
        icon={<Users size={20} />}
        label="Section 8"
        subtitle={statsSubtitle}
        value={section8Count}
        colorTheme="orange"
      />
      <SimpleStat
        icon={<Users size={20} />}
        label="Regular"
        subtitle={statsSubtitle}
        value={regularCount}
        colorTheme="green"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label="Total Rent (All)"
        subtitle="Across all properties"
        numericValue={totalRentAllProperties}
        format={currency}
        colorTheme="blue"
      />
      <SimpleStat
        icon={<TrendingUp size={20} />}
        label="Net Rent (Accumulated)"
        subtitle="Total collected minus mortgages paid"
        numericValue={netCashflowAllProperties}
        format={currency}
        colorTheme={netCashflowAllProperties < 0 ? "red" : "green"}
        valueClassName={
          netCashflowAllProperties < 0 ? "rm-negative" : undefined
        }
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label="Accumulated Gross Rent"
        subtitle="Total collected from all tenants"
        numericValue={accumulatedRentCollected}
        format={currency}
        colorTheme="green"
      />
    </section>
  );
}
