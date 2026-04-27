<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" :width="size" :height="size">
        <defs>
            <linearGradient id="arbour-logo-g" x1="80" y1="80" x2="432" y2="460" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="var(--arbour-logo-1, var(--arbour-highlight))" />
                <stop offset="55%" stop-color="var(--arbour-logo-2, var(--arbour-primary))" />
                <stop offset="100%" stop-color="var(--arbour-logo-3, var(--arbour-secondary))" />
            </linearGradient>
        </defs>

        <path d="M 56 100 L 456 100"
              stroke="url(#arbour-logo-g)" stroke-width="40" stroke-linecap="round" fill="none" />
        <path d="M 86 150 L 426 150"
              stroke="url(#arbour-logo-g)" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M 132 170 L 132 462"
              stroke="url(#arbour-logo-g)" stroke-width="40" stroke-linecap="round" fill="none" />
        <path d="M 380 170 L 380 462"
              stroke="url(#arbour-logo-g)" stroke-width="40" stroke-linecap="round" fill="none" />
        <rect x="166" y="252" width="180" height="34" rx="9" fill="url(#arbour-logo-g)" />
        <rect x="166" y="298" width="180" height="34" rx="9" fill="url(#arbour-logo-g)" />
        <rect x="166" y="344" width="180" height="34" rx="9" fill="url(#arbour-logo-g)" />
    </svg>
</template>

<script>
export default {
    props: {
        size: {
            type: Number,
            default: 40,
        },
    },
};
</script>
