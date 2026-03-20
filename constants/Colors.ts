/**
 * AbejaNet Color Palette
 * Comprehensive light and dark mode tokens used across the entire app.
 * Use the useAppColors() hook to access these from any component.
 */

export const Colors = {
  light: {
    // --- Base ---
    text: '#1F2937',
    textSecondary: '#4B5563',
    textTertiary: '#6B7280',
    background: '#F0F4F7',
    card: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // --- Brand ---
    primary: '#1976d2',
    primaryDark: '#1565C0',
    accent: '#F59E0B',
    accentDark: '#D97706',

    // --- Inputs ---
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',
    inputText: '#1F2937',
    placeholder: '#9CA3AF',

    // --- Header / Navigation ---
    headerBackground: '#1976d2',
    headerText: '#FFFFFF',
    drawerBackground: '#FFFFFF',
    drawerActiveText: '#1976d2',
    drawerInactiveText: '#374151',
    drawerDivider: '#E5E7EB',
    logoContainerBg: '#F3F4F6',

    // --- Status / Semantic ---
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    // --- Stat Cards ---
    statCardBg: '#FFFFFF',
    statValue: '#1F2937',
    statLabel: '#6B7280',

    // --- News / Cards ---
    newsCardBg: '#FFFFFF',
    newsTitle: '#333333',
    newsSource: '#888888',

    // --- Alerts ---
    alertCardBg: '#FFFFFF',
    alertUnreadBg: '#FFF3E0',
    alertUnreadBorder: '#FF7043',
    alertReadBorder: '#E0E0E0',

    // --- Profile ---
    profileCardBg: '#FFFFFF',
    profileIconColor: '#3498db',

    // --- Colmena Detail ---
    summaryBg: '#FFFFFF',
    chartContainerBg: '#FFFFFF',
    chipBg: '#E5E7EB',
    chipText: '#374151',
    chipActiveBg: '#007BFF',
    chipActiveText: '#FFFFFF',
    timeRangeBg: '#E9ECEF',
    timeRangeSelectedBg: '#FFFFFF',
    timeRangeText: '#6C757D',
    timeRangeSelectedText: '#007BFF',
    selectedPointBg: '#FAFAFA',
    selectedPointPlaceholderBg: '#F0F4F8',
    selectedPointPlaceholderBorder: '#D1DCE5',

    // --- Misc ---
    separator: '#CCCCCC',
    shadow: '#000000',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
    notificationBadge: '#EF4444',
    skeleton: '#E5E7EB',
    skeletonHighlight: '#F3F4F6',
  },
  dark: {
    // --- Base ---
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    background: '#111827',
    card: '#1F2937',
    border: '#374151',
    borderLight: '#2D3748',

    // --- Brand ---
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    accent: '#FBBF24',
    accentDark: '#F59E0B',

    // --- Inputs ---
    inputBackground: '#1F2937',
    inputBorder: '#4B5563',
    inputText: '#F9FAFB',
    placeholder: '#6B7280',

    // --- Header / Navigation ---
    headerBackground: '#1E3A5F',
    headerText: '#FFFFFF',
    drawerBackground: '#1F2937',
    drawerActiveText: '#60A5FA',
    drawerInactiveText: '#D1D5DB',
    drawerDivider: '#374151',
    logoContainerBg: '#111827',

    // --- Status / Semantic ---
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',

    // --- Stat Cards ---
    statCardBg: '#1F2937',
    statValue: '#F9FAFB',
    statLabel: '#9CA3AF',

    // --- News / Cards ---
    newsCardBg: '#1F2937',
    newsTitle: '#F3F4F6',
    newsSource: '#9CA3AF',

    // --- Alerts ---
    alertCardBg: '#1F2937',
    alertUnreadBg: '#44290E',
    alertUnreadBorder: '#F97316',
    alertReadBorder: '#374151',

    // --- Profile ---
    profileCardBg: '#1F2937',
    profileIconColor: '#60A5FA',

    // --- Colmena Detail ---
    summaryBg: '#1F2937',
    chartContainerBg: '#1F2937',
    chipBg: '#374151',
    chipText: '#D1D5DB',
    chipActiveBg: '#3B82F6',
    chipActiveText: '#FFFFFF',
    timeRangeBg: '#374151',
    timeRangeSelectedBg: '#1F2937',
    timeRangeText: '#9CA3AF',
    timeRangeSelectedText: '#60A5FA',
    selectedPointBg: '#374151',
    selectedPointPlaceholderBg: '#1F2937',
    selectedPointPlaceholderBorder: '#4B5563',

    // --- Misc ---
    separator: '#4B5563',
    shadow: '#000000',
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    notificationBadge: '#EF4444',
    skeleton: '#374151',
    skeletonHighlight: '#4B5563',
  },
};
