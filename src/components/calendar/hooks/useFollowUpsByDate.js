import { useMemo } from "react";

export function useFollowUpsByDate(allFollowUps, currentMonth, currentYear) {
  return useMemo(() => {
    const map = {};
    allFollowUps.forEach((followUp) => {
      const date = new Date(followUp.date);
      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        const day = date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(followUp);
      }
    });
    return map;
  }, [allFollowUps, currentMonth, currentYear]);
}
