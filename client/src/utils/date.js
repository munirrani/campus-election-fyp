function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
  
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
  
    return `${formattedDay}/${formattedMonth}/${year} ${formattedHour}:${formattedMinute}:${formattedMinute}${period}`;
}

function formatDateText(date) {
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const formattedMinute = String(minute).padStart(2, '0');
  
    return `${day} ${monthNames[monthIndex]} ${year} ${formattedHour}:${formattedMinute}${period}`;
}

function formatTimeRemaining(time) {
    const currentTime = Math.floor((new Date()).getTime() / 1000);
    const timeDifferenceInSeconds = Math.abs(time - currentTime);
    const days = Math.floor(timeDifferenceInSeconds / (3600 * 24));
    const hours = Math.floor(timeDifferenceInSeconds / 3600) % 24;
    const minutes = Math.floor(timeDifferenceInSeconds / 60) % 60;
    const seconds = timeDifferenceInSeconds % 60;

    // Return in Days, Hours, Minutes, Seconds string
    if (days === 0 && hours === 0 && minutes === 0) {
        return `${seconds} Seconds`;
    } else if (days === 0 && hours === 0) {
        return `${minutes} Minutes ${seconds} Seconds`;
    } else if (days === 0) {
        return `${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
    } else {
        return `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
    }
}


function getTimeDifferenceInDaysHoursMinutes(time) {
    const currentTime = Math.floor((new Date()).getTime() / 1000);
    const timeDifferenceInSeconds = Math.abs(time - currentTime);
    const days = Math.floor(timeDifferenceInSeconds / (3600 * 24));
    const hours = Math.floor(timeDifferenceInSeconds / 3600) % 24;
    const minutes = Math.floor(timeDifferenceInSeconds / 60) % 60;

    // Return in Days, Hours, Minutes string
    if (days === 0 && hours === 0 && minutes === 0) {
        return "Less than a minute";
    } else if (days === 0 && hours === 0) {
        return `${minutes} Minutes`;
    } else if (days === 0) {
        return `${hours} Hours ${minutes} Minutes`;
    } else {
        return `${days} Days ${hours} Hours ${minutes} Minutes`;
    }
}

export { formatDate, formatDateText, getTimeDifferenceInDaysHoursMinutes, formatTimeRemaining };