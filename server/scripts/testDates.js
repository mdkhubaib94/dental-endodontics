const generateUpcomingDates = (numWeekdays) => {
  const dates = [];
  const start = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric' };

  let offset = 0;
  while (dates.length < numWeekdays) {
    const futureDate = new Date(start);
    futureDate.setDate(start.getDate() + offset);
    offset += 1;

    const day = futureDate.getDay();
    // Skip weekends (Sun=0, Sat=6)
    if (day === 0 || day === 6) continue;

    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    dates.push({
      fullDate: `${yyyy}-${mm}-${dd}`,
      displayDate: futureDate.toLocaleDateString('en-US', options),
    });
  }

  return dates;
};

console.log(generateUpcomingDates(5));
