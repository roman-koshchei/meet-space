export const getInitials = (name: string) => {
    return name.split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

export const getColorByInitial = (id: string): string => {
    const colors = [
        "bg-blue-100 text-blue-800",
        "bg-purple-100 text-purple-800",
        "bg-green-100 text-green-800",
        "bg-yellow-100 text-yellow-800",
        "bg-red-100 text-red-800",
        "bg-pink-100 text-pink-800",
        "bg-indigo-100 text-indigo-800",
    ]

    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = sum % colors.length;

    return colors[colorIndex];
};