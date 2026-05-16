import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import React, { useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";

export type AvatarId = string;
export interface AvatarProps {
  size?: number;
}

function generateDoctorXml(
  seed: string,
  skinColor: string,
  top: string,
  hairColor: string,
  bg: string,
  accessory?: string,
  facialHair?: string,
) {
  return createAvatar(avataaars, {
    seed,
    skinColor: [skinColor],
    top: [top],
    hairColor: [hairColor],
    clothing: ["blazerAndShirt"], // Doctor's coat
    clothesColor: ["ffffff"],
    eyes: ["default", "happy", "wink"],
    eyebrows: ["defaultNatural", "raisedExcitedNatural"],
    mouth: ["smile", "twinkle"],
    backgroundColor: [bg.replace("#", "")],
    accessories: accessory ? [accessory] : [],
    facialHair: facialHair ? [facialHair] : [],
  } as any).toString();
}

interface Cfg {
  skinColor: string;
  top: string;
  hairColor: string;
  bg: string;
  accessory?: string;
  facialHair?: string;
}

const SMART_LIBRARY: Record<string, Cfg> = {
  // Original Base
  male_light: {
    skinColor: "ffdbb4",
    top: "shortFlat",
    hairColor: "2c1b18",
    bg: "#EFF6FF",
  },
  male_medium: {
    skinColor: "d08b5b",
    top: "shortWaved",
    hairColor: "724133",
    bg: "#F0FDF4",
  },
  male_dark: {
    skinColor: "614335",
    top: "dreads01",
    hairColor: "2c1b18",
    bg: "#FFF7ED",
  },
  female_light: {
    skinColor: "ffdbb4",
    top: "bun",
    hairColor: "2c1b18",
    bg: "#FDF4FF",
  },
  female_medium: {
    skinColor: "d08b5b",
    top: "curvy",
    hairColor: "b58143",
    bg: "#FFF1F2",
  },
  female_dark: {
    skinColor: "614335",
    top: "fro",
    hairColor: "2c1b18",
    bg: "#F0FDFA",
  },

  // Expanded Diversity (Younger)
  male_4: {
    skinColor: "edb98a",
    top: "shortCurly",
    hairColor: "724133",
    bg: "#F3F4F6",
    accessory: "prescription02",
  },
  male_5: {
    skinColor: "ae5d29",
    top: "frizzle",
    hairColor: "2c1b18",
    bg: "#ECFEFF",
  },
  male_6: {
    skinColor: "fd9841",
    top: "shaggy",
    hairColor: "4a3123",
    bg: "#F5F3FF",
  },
  female_4: {
    skinColor: "edb98a",
    top: "straight02",
    hairColor: "724133",
    bg: "#FEFCE8",
    accessory: "round",
  },
  female_5: {
    skinColor: "ae5d29",
    top: "miaWallace",
    hairColor: "2c1b18",
    bg: "#FFEDD5",
  },
  female_6: {
    skinColor: "fd9841",
    top: "longButNotTooLong",
    hairColor: "2c1b18",
    bg: "#FCE7F3",
    accessory: "prescription01",
  },
};

export function DoctorAvatar({ id, size = 80 }: { id: string; size?: number }) {
  const cfg = SMART_LIBRARY[id];

  const xml = useMemo(() => {
    if (!cfg) return "";
    return generateDoctorXml(
      `zanki-smart-${id}`,
      cfg.skinColor,
      cfg.top,
      cfg.hairColor,
      cfg.bg,
      cfg.accessory,
      cfg.facialHair,
    );
  }, [id, cfg]);

  if (!xml) return null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        overflow: "hidden",
        backgroundColor: cfg.bg,
      }}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

export const AVATARS = Object.keys(SMART_LIBRARY).map((id) => ({
  id,
  label: "Doctor",
  component: ({ size }: AvatarProps) => <DoctorAvatar id={id} size={size} />,
}));

export function AvatarById({
  id,
  size = 80,
}: {
  id: AvatarId | null;
  size?: number;
}) {
  if (!id) return null;
  return <DoctorAvatar id={id} size={size} />;
}
