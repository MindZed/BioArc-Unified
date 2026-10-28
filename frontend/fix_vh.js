const fs = require('fs');

// 1. Fix ClientLayout
let layoutContent = fs.readFileSync('components/layout/ClientLayout.tsx', 'utf8');
layoutContent = layoutContent.replace('overflow-y-auto', 'overflow-hidden');
fs.writeFileSync('components/layout/ClientLayout.tsx', layoutContent);

// 2. Fix page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Header margins and paddings
content = content.replace('pt-4 pb-2 px-8 sticky top-0 backdrop-blur-md z-40 mb-4', 'pt-3 pb-2 px-6 sticky top-0 backdrop-blur-md z-40 mb-2');
content = content.replace('text-[32px]', 'text-[24px]');
content = content.replace('px-6 py-1', 'px-4 py-1');

// Grid wrapper padding
content = content.replace('px-8 flex-1 overflow-hidden', 'px-6 pb-4 flex-1 min-h-0');

// Grid gaps
content = content.replace('gap-4 h-full', 'gap-3 h-full min-h-0');

// Card classes: ensure min-h-0 and flex-col
// Replace motion-card with motion-card min-h-0 
content = content.replace(/motion-card/g, 'motion-card min-h-0');

// Reduce card paddings from p-4 to p-3, and some p-6 to p-3
content = content.replace(/ p-4 /g, ' p-3 ');
content = content.replace(/ p-6 /g, ' p-3 ');

// Reduce margins inside cards
content = content.replace(/mt-4/g, 'mt-2');
content = content.replace(/mb-4/g, 'mb-2');
content = content.replace(/mb-6/g, 'mb-2');
content = content.replace(/mt-6/g, 'mt-3');
content = content.replace(/mt-8/g, 'mt-4');

// Text sizes for large values
content = content.replace(/text-\\[32px\\] md:text-\\[36px\\] xl:text-\\[42px\\]/g, 'text-2xl xl:text-3xl');
content = content.replace(/text-\\[32px\\] md:text-\\[36px\\]/g, 'text-2xl xl:text-3xl');

// Log list and Actuator list
// They need to be flex-1 min-h-0 overflow-y-auto
content = content.replace('overflow-y-auto no-scrollbar space-y-3', 'flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2');
content = content.replace('space-y-4 overflow-y-auto no-scrollbar flex-1 -mx-2 px-2', 'flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 -mx-2 px-2');

// Fix reservoir gauge height
content = content.replace('w-24 h-32 mt-4', 'w-20 h-28 mt-2');
content = content.replace('text-2xl font-bold', 'text-xl font-bold');

// Chart height - it should flex to fill
// It currently has `h-full` on the relative wrapper, which is fine, but we replaced `min-h-[260px]` with `h-full` earlier. 
// We should make sure the chart wrapper doesn't overflow.
content = content.replace('flex-1 flex flex-col relative mt-2', 'flex-1 flex flex-col relative mt-2 min-h-0');

// Actuator item padding
content = content.replace(/p-2/g, 'p-1.5');
content = content.replace(/p-4/g, 'p-2');

fs.writeFileSync('app/page.tsx', content);
console.log('Aggressively optimized layout for 100vh');
