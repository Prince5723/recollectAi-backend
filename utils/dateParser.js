import * as chrono from 'chrono-node';

// Parse date strings into Date objects
export const parseDate = (dateString) => {
  try {
    // Try to parse the date using chrono-node
    const parsedDate = chrono.parseDate(dateString);
    
    if (parsedDate) {
      return parsedDate;
    }

    // Fallback: try native Date parsing
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

// Extract dates from text
export const extractDates = (text) => {
  try {
    const results = chrono.parse(text);
    return results.map(result => ({
      text: result.text,
      date: result.start.date(),
      index: result.index,
    }));
  } catch (error) {
    console.error('Date extraction error:', error);
    return [];
  }
};

