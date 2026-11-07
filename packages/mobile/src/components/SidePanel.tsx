import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  barHeight,
  corner,
  elevation,
  grabber,
  grid,
  motion,
  sidePanelTopInset,
  sidePanelWidth,
  systemColors,
  transitionDuration,
  typeScale,
  usesFullHeightSheet,
} from '../hig';
import { KEYBOARD_WINDOW_SHRINK } from '../layout';
import { isPanelRoot, panelContentMode, panelTitle, type PanelSection } from '../navigation';
import { surfaces } from '../theme';

interface SidePanelProps {
  /** `false` keeps the sheet mounted but slides it out of the way. */
  open: boolean;
  section: PanelSection;
  /** A shorter bottom-anchored card, used for the compact AI conversation. */
  compact?: boolean;
  /** Fraction of the window the compact card occupies; grows with the chat. */
  compactHeightRatio?: number;
  onClose: () => void;
  onBack: () => void;
  children: JSX.Element | null;
}

/**
 * A trailing modal sheet per HIG "Modality": it dims the presenting context,
 * slides in from the trailing edge, exposes a grabber and a navigation bar,
 * and is dismissible via the Done button, the dimming view or the hardware
 * back button. Reduce Motion collapses the transition to zero duration.
 */
export const SidePanel: FC<SidePanelProps> = ({
  open,
  section,
  compact = false,
  compactHeightRatio = 0.58,
  onClose,
  onBack,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const metrics = useMemo(() => ({ width, height }), [width, height]);
  const panelWidth = sidePanelWidth(metrics);
  /**
   * A compact card leaves the terminal output visible above it. Android's
   * `adjustResize` shrinks the root view without updating `useWindowDimensions`,
   * so the overlay's measured height is the only reliable size for the area
   * above the IME. Raise the card's share of that smaller area to keep roughly
   * the same absolute height while typing, with its bottom edge on the IME.
   */
  const [availableHeight, setAvailableHeight] = useState(height);
  const keyboardCovers = availableHeight < height - KEYBOARD_WINDOW_SHRINK;
  const cardRatio = keyboardCovers ? 0.62 : compactHeightRatio;
  const sheetHeight = Math.round(availableHeight * (compact ? cardRatio : 1));
  const topInset = compact
    ? 0
    : sidePanelTopInset(metrics) + (usesFullHeightSheet(metrics) ? insets.top : 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showContent, setShowContent] = useState(open);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  /** Keep the newest dismiss handlers reachable without re-subscribing on every render. */
  const dismissHandlers = useRef({ onClose, onBack });
  dismissHandlers.current = { onClose, onBack };

  const duration = transitionDuration(open ? motion.presentMs : motion.dismissMs, reduceMotion);
  const mode = panelContentMode(section);
  const root = isPanelRoot(section);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) setReduceMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', () => {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(value => setReduceMotion(value))
        .catch(() => undefined);
    });
    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [open, duration, progress]);

  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (root) dismissHandlers.current.onClose();
      else dismissHandlers.current.onBack();
      return true;
    });
    return () => subscription.remove();
  }, [open, root]);

  useEffect(() => {
    if (open) {
      setShowContent(true);
      return undefined;
    }
    const timer = setTimeout(() => setShowContent(false), duration + 40);
    return () => clearTimeout(timer);
  }, [open, duration]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [panelWidth, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  });
  // Keep the presenting terminal readable behind a compact conversation card.
  const scrimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: compact ? [0, 0.34] : [0, 1],
  });

  const content = showContent ? children : null;
  const body =
    mode === 'flex' ? (
      <View style={[styles.flexBody, compact && styles.flexBodyCompact]}>{content}</View>
    ) : (
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );

  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityViewIsModal={open}
      style={styles.overlay}
      onLayout={(event: { nativeEvent: { layout: { height: number } } }) => {
        const next = event.nativeEvent.layout.height;
        if (next > 0 && Math.abs(next - availableHeight) > 1) setAvailableHeight(next);
      }}
    >
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭功能面板"
          style={styles.scrimHit}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal={open}
        style={[
          styles.sheet,
          compact ? styles.sheetCompact : styles.sheetFull,
          {
            width: compact ? undefined : panelWidth,
            height: compact ? sheetHeight : undefined,
            paddingTop: topInset,
            paddingBottom: insets.bottom,
            transform: compact ? [{ translateY }] : [{ translateX }],
          },
        ]}
      >
        <View style={styles.grabber} />

        <View style={[styles.navBar, compact && styles.navBarCompact]}>
          <View style={styles.navSide}>
            {root ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="返回功能列表"
                hitSlop={compact ? { top: 5, bottom: 5, left: 4, right: 4 } : undefined}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.backButton,
                  compact && styles.navButtonCompact,
                  pressed && styles.pressed,
                ]}
                onPress={onBack}
              >
                <Ionicons name="chevron-back" size={22} color={systemColors.systemBlue} />
                <Text style={styles.backText}>功能</Text>
              </Pressable>
            )}
          </View>
          <Text numberOfLines={1} style={styles.navTitle}>
            {panelTitle(section)}
          </Text>
          <View style={[styles.navSide, styles.navSideRight]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="完成，关闭面板"
              accessibilityHint="返回终端主页面"
              hitSlop={compact ? { top: 5, bottom: 5, left: 6, right: 6 } : undefined}
              style={({ pressed }: { pressed: boolean }) => [
                styles.doneButton,
                compact && styles.navButtonCompact,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.doneText}>完成</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          // The compact overlay already tracks the resized window; avoiding the
          // IME a second time would squeeze the composer behind the keyboard.
          behavior={compact ? undefined : Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {body}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: systemColors.scrim,
  },
  scrimHit: { flex: 1 },
  sheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    // One elevation step above the grouped page, the way a presented sheet
    // sits above its context.
    backgroundColor: surfaces.sheet,
    shadowColor: '#000000',
    shadowOpacity: elevation.level3.shadowOpacity,
    shadowRadius: elevation.level3.shadowRadius,
    shadowOffset: elevation.level3.shadowOffset,
    elevation: 16,
    overflow: 'hidden',
  },
  sheetFull: {
    top: 0,
    borderTopLeftRadius: corner.sheet,
    borderBottomLeftRadius: corner.sheet,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: systemColors.separator,
    shadowOffset: { width: -8, height: 0 },
  },
  /** Compact AI card: full width, anchored to the bottom, slides upward. */
  sheetCompact: {
    left: 0,
    borderTopLeftRadius: corner.sheet,
    borderTopRightRadius: corner.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: systemColors.separator,
    shadowOffset: { width: 0, height: -8 },
  },
  grabber: {
    width: grabber.width,
    height: grabber.height,
    borderRadius: grabber.height / 2,
    backgroundColor: grabber.color,
    alignSelf: 'center',
    marginTop: grabber.topInset,
    marginBottom: grid.unit,
  },
  navBar: {
    minHeight: barHeight.navigation,
    paddingHorizontal: grid.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: grid.unit,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: systemColors.separator,
  },
  navSide: { minWidth: 68, alignItems: 'flex-start' },
  navSideRight: { alignItems: 'flex-end' },
  navBarCompact: { minHeight: 36 },
  navButtonCompact: { minHeight: 34 },
  flexBodyCompact: { paddingTop: grid.unit },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: systemColors.label,
    fontSize: typeScale.headline.fontSize,
    lineHeight: typeScale.headline.lineHeight,
    fontWeight: typeScale.headline.fontWeight,
    letterSpacing: typeScale.headline.letterSpacing,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -grid.unit,
    paddingLeft: grid.unit,
  },
  backText: {
    color: systemColors.systemBlue,
    fontSize: typeScale.body.fontSize,
    letterSpacing: typeScale.body.letterSpacing,
  },
  doneButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: systemColors.systemBlue,
    fontSize: typeScale.headline.fontSize,
    fontWeight: '600',
    letterSpacing: typeScale.headline.letterSpacing,
  },
  pressed: { opacity: 0.55 },
  container: { flex: 1 },
  flexBody: { flex: 1, paddingHorizontal: grid.base, paddingTop: grid.base },
  scrollBody: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: grid.base,
    paddingTop: grid.comfortable,
    paddingBottom: grid.loose,
  },
});
