import React, { useEffect, useState } from 'react';

const TimeWindowBar = ({ electionStartTimestamp, electionEndTimestamp }) => {
  const [progress, setProgress] = useState(0);

  const calculateTimeProgress = (startTimestamp, endTimestamp, currentTimestamp) => {
    const totalDuration = endTimestamp - startTimestamp;
    const elapsedDuration = currentTimestamp - startTimestamp;

    return (elapsedDuration / totalDuration) * 100;
  };

  useEffect(() => {
    const startTimestamp = new Date(electionStartTimestamp).getTime(); // Replace with your actual start time
    const endTimestamp = new Date(electionEndTimestamp).getTime(); // Replace with your actual end time

    const updateProgress = () => {
      const currentTimestamp = new Date().getTime();
      const newProgress = calculateTimeProgress(startTimestamp, endTimestamp, currentTimestamp);
      setProgress(Math.min(100, Math.max(0, newProgress)));
    };

    const interval = setInterval(updateProgress, 1000); // Update every second

    return () => {
      clearInterval(interval);
    };
  }, [electionStartTimestamp, electionEndTimestamp]);

  return (
    <div className="w-full h-3 bg-gray-300">
      <div className="h-full bg-blue-600" style={{ width: `${progress}%` }}></div>
    </div>
  );
};

export default TimeWindowBar;
