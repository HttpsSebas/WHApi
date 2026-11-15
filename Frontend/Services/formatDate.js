export function formatDateToString(date){
    const today = new Date()
    const lastSeenDate = new Date(date)
    const diffTime = Math.abs(today - lastSeenDate)
    const dayDiff = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if(dayDiff > 1){
        return `${dayDiff} days ago`
    } else if(dayDiff === 1){
        return `Yesterday at ${lastSeenDate.getHours()}:${lastSeenDate.getMinutes()}`
    }

    return `Last seen ${lastSeenDate.getHours()}:${lastSeenDate.getMinutes()}`
}