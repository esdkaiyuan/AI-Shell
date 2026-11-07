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
import { isPanelRoot, panelContentMode, panelTitle, type PanelSection } from '../navigation';

interface SidePanelProps {
  /** `false` keeps the sheet mounted but slides it out of the way. */
  open: boolean;
  section: PanelSection;
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
export const SidePanel: FC<SidePanelProps> = ({ open, section, onClose, onBack, children }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const metrics = useMemo(() => ({ width, height }), [width, height]);
  const panelWidth = sidePanelWidth(metrics);
  const topInset = sidePanelTopInset(metrics) + (usesFullHeightSheet(metrics) ? insets.top : 0);
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
  const scrimOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const content = showContent ? children : null;
  const body =
    mode === 'flex' ? (
      <View style={styles.flexBody}>{content}</View>
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
          {
            width: panelWidth,
            paddingTop: topInset,
            paddingBottom: insets.bottom,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.grabber} />

        <View style={styles.navBar}>
          <View style={styles.navSide}>
            {root ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="返回功能列表"
                style={({ pressed }: { pressed: boolean }) => [
                  styles.backButton,
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
              style={({ pressed }: { pressed: boolean }) => [
                styles.doneButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.doneText}>完成</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
    top: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: corner.sheet,
    borderBottomLeftRadius: corner.sheet,
    backgroundColor: systemColors.systemGroupedBackground,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: systemColors.separator,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: -8, height: 0 },
    elevation: 16,
    overflow: 'hidden',
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
