/**
 * Widget customization page.
 * Two-column layout with settings form (left) and live preview (right).
 * @module app/dashboard/[orgSlug]/projects/[projectId]/widget/page
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconMessageCircle,
  IconX,
  IconVideo,
  IconMail,
  IconCircleFilled,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useProject } from "../layout";
import {
  getLiveConnectSettings,
  updateLiveConnectSettings,
} from "@/lib/api";
import type {
  LiveConnectSettings,
  WidgetPosition,
  WidgetFontFamily,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Font family options with their CSS stacks */
const FONT_OPTIONS: { value: WidgetFontFamily; label: string }[] = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Inter", label: "Inter" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Nunito", label: "Nunito" },
  { value: "System Default", label: "System Default" },
];

/** Position options for the 2x2 grid */
const POSITION_OPTIONS: { value: WidgetPosition; label: string }[] = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

/** Maps font family names to CSS font stacks */
function getFontStack(fontFamily: WidgetFontFamily): string {
  switch (fontFamily) {
    case "JetBrains Mono":
      return "'JetBrains Mono', monospace";
    case "Inter":
      return "'Inter', system-ui, sans-serif";
    case "DM Sans":
      return "'DM Sans', sans-serif";
    case "Nunito":
      return "'Nunito', sans-serif";
    case "System Default":
      return "system-ui, -apple-system, sans-serif";
  }
}

/**
 * Widget customization page component.
 */
export default function WidgetPage() {
  const { projectId } = useProject();

  // Loading / error state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded (saved) settings for change detection
  const [savedSettings, setSavedSettings] =
    useState<LiveConnectSettings | null>(null);

  // Form state
  const [isActive, setIsActive] = useState(true);
  const [widgetColor, setWidgetColor] = useState("#FACC15");
  const [backgroundColor, setBackgroundColor] = useState("#0c0a09");
  const [textColor, setTextColor] = useState("#fafaf9");
  const [borderRadius, setBorderRadius] = useState(0);
  const [fontFamily, setFontFamily] = useState<WidgetFontFamily>("JetBrains Mono");
  const [widgetPosition, setWidgetPosition] =
    useState<WidgetPosition>("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hi! How can we help you today?"
  );
  const [offlineMessage, setOfflineMessage] = useState(
    "No reps available. Leave your info and we'll get back to you."
  );

  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState(false);

  /**
   * Populates form state from a settings object.
   */
  const populateForm = useCallback((s: LiveConnectSettings) => {
    setIsActive(s.isActive);
    setWidgetColor(s.widgetColor);
    setBackgroundColor(s.backgroundColor);
    setTextColor(s.textColor);
    setBorderRadius(s.borderRadius);
    setFontFamily(s.fontFamily);
    setWidgetPosition(s.widgetPosition);
    setWelcomeMessage(s.welcomeMessage);
    setOfflineMessage(s.offlineMessage);
  }, []);

  /**
   * Loads settings from the API on mount.
   */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const settings = await getLiveConnectSettings(projectId);
        if (cancelled) return;
        setSavedSettings(settings);
        populateForm(settings);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load settings"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, populateForm]);

  /**
   * Determines if any form field has changed from the saved state.
   */
  const hasChanges =
    savedSettings !== null &&
    (isActive !== savedSettings.isActive ||
      widgetColor !== savedSettings.widgetColor ||
      backgroundColor !== savedSettings.backgroundColor ||
      textColor !== savedSettings.textColor ||
      borderRadius !== savedSettings.borderRadius ||
      fontFamily !== savedSettings.fontFamily ||
      widgetPosition !== savedSettings.widgetPosition ||
      welcomeMessage !== savedSettings.welcomeMessage ||
      offlineMessage !== savedSettings.offlineMessage);

  /**
   * Saves all settings to the API.
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updateLiveConnectSettings(projectId, {
        isActive,
        widgetColor,
        backgroundColor,
        textColor,
        borderRadius,
        fontFamily,
        widgetPosition,
        welcomeMessage,
        offlineMessage,
      });
      setSavedSettings(updated);
      toast.success("Widget settings saved");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Color Picker Helper
  // ============================================================================

  /**
   * Renders a color picker row with swatch and hex input.
   */
  const renderColorPicker = (
    label: string,
    description: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-9 w-9 cursor-pointer border border-border bg-transparent p-0.5"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            if (/^#[0-9A-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-28 font-mono text-xs"
          maxLength={7}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-semibold">Widget Customization</h2>
        <p className="text-sm text-muted-foreground">
          Customize how the widget appears on your website
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ================================================================
            Settings Form (Left Column)
            ================================================================ */}
        <div className="space-y-4 lg:col-span-3">
          {/* Widget Status */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Widget Active</p>
                  <p className="text-xs text-muted-foreground">
                    {isActive
                      ? "Your widget is live and visible to visitors."
                      : "Your widget is hidden from visitors."}
                  </p>
                </div>
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  className="min-w-16"
                >
                  {isActive ? "ON" : "OFF"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {renderColorPicker(
                "Accent Color",
                "The main color for buttons and interactive elements",
                widgetColor,
                setWidgetColor
              )}
              {renderColorPicker(
                "Background Color",
                "Widget panel background",
                backgroundColor,
                setBackgroundColor
              )}
              {renderColorPicker(
                "Text Color",
                "Text and label color",
                textColor,
                setTextColor
              )}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Border Radius</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {borderRadius}px
                  </span>
                </div>
                <Slider
                  value={borderRadius}
                  onValueChange={(v) => setBorderRadius(v as number)}
                  min={0}
                  max={24}
                />
              </div>
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={fontFamily}
                  onValueChange={(v) => setFontFamily(v as WidgetFontFamily)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Position */}
          <Card>
            <CardHeader>
              <CardTitle>Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Widget Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWidgetPosition(opt.value)}
                      className={cn(
                        "border px-3 py-2 text-xs font-medium transition-colors",
                        widgetPosition === opt.value
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Shown when the widget panel opens. Max 500 chars.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offlineMessage">Offline Message</Label>
                <Textarea
                  id="offlineMessage"
                  value={offlineMessage}
                  onChange={(e) => setOfflineMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Shown when no reps are online. Max 500 chars.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="py-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================
            Live Preview (Right Column)
            ================================================================ */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative overflow-hidden border border-border"
                  style={{ height: 480 }}
                >
                  {/* Simulated website background */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: "#1a1a1a",
                      backgroundImage:
                        "radial-gradient(circle, #333 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />

                  {/* Widget preview container */}
                  <div className="absolute inset-0">
                    {/* Expanded panel */}
                    {previewExpanded && (
                      <div
                        className="absolute"
                        style={{
                          top: widgetPosition.includes("top") ? 72 : "auto",
                          bottom: widgetPosition.includes("bottom") ? 72 : "auto",
                          left: widgetPosition.includes("left") ? 16 : "auto",
                          right: widgetPosition.includes("right") ? 16 : "auto",
                          width: 260,
                          backgroundColor,
                          color: textColor,
                          borderRadius: `${borderRadius}px`,
                          border: `1px solid color-mix(in srgb, ${backgroundColor}, white 14%)`,
                          fontFamily: getFontStack(fontFamily),
                          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                          overflow: "hidden",
                        }}
                      >
                        {/* Panel header */}
                        <div
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: `color-mix(in srgb, ${backgroundColor}, white 8%)`,
                            borderBottom: `1px solid color-mix(in srgb, ${backgroundColor}, white 14%)`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <IconCircleFilled
                              className="h-2.5 w-2.5"
                              style={{ color: "#22c55e" }}
                            />
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: textColor,
                              }}
                            >
                              Online
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewExpanded(false)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              display: "flex",
                              color: textColor,
                              opacity: 0.6,
                            }}
                          >
                            <IconX className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Panel content */}
                        <div style={{ padding: 14 }}>
                          <p
                            style={{
                              fontSize: 13,
                              color: textColor,
                              marginBottom: 14,
                              lineHeight: 1.4,
                            }}
                          >
                            {welcomeMessage || "Hi! How can we help you today?"}
                          </p>

                          {/* Action buttons */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 12px",
                                backgroundColor: widgetColor,
                                color: backgroundColor,
                                border: "none",
                                borderRadius: `${borderRadius}px`,
                                cursor: "default",
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "inherit",
                              }}
                            >
                              <IconVideo className="h-4 w-4" />
                              Start Video Call
                            </button>
                            <button
                              type="button"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 12px",
                                backgroundColor: "transparent",
                                color: textColor,
                                border: `1px solid color-mix(in srgb, ${backgroundColor}, white 14%)`,
                                borderRadius: `${borderRadius}px`,
                                cursor: "default",
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "inherit",
                              }}
                            >
                              <IconMail className="h-4 w-4" />
                              Send a Message
                            </button>
                          </div>
                        </div>

                        {/* Footer */}
                        <div
                          style={{
                            padding: "8px 14px",
                            textAlign: "center",
                            fontSize: 10,
                            opacity: 0.5,
                            color: textColor,
                            borderTop: `1px solid color-mix(in srgb, ${backgroundColor}, white 14%)`,
                          }}
                        >
                          Powered by LiveConnect
                        </div>
                      </div>
                    )}

                    {/* FAB Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewExpanded(!previewExpanded)}
                      className="absolute"
                      style={{
                        top: widgetPosition.includes("top") ? 16 : "auto",
                        bottom: widgetPosition.includes("bottom") ? 16 : "auto",
                        left: widgetPosition.includes("left") ? 16 : "auto",
                        right: widgetPosition.includes("right") ? 16 : "auto",
                        width: 48,
                        height: 48,
                        backgroundColor: widgetColor,
                        border: "none",
                        borderRadius: `${borderRadius}px`,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                      }}
                    >
                      {previewExpanded ? (
                        <IconX
                          className="h-5 w-5"
                          style={{ color: backgroundColor }}
                        />
                      ) : (
                        <IconMessageCircle
                          className="h-5 w-5"
                          style={{ color: backgroundColor }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Click the widget button to toggle the expanded preview.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
