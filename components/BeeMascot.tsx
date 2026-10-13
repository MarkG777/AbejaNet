import React, { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Colores fijos de la mascota (no cambian con el tema claro/oscuro, igual que un logotipo).
const HONEY = '#F5A623';
const HONEY_LIGHT = '#FFCE66';
const STRIPE = '#2B2118';
const WING = '#CFE8FF';
const WING_LIGHT = '#EAF5FF';
const BLUSH = '#FF9DAE';

interface BeeMascotProps {
  size?: number;
}

// Mascota "Abeja Asistente" para la pantalla de chat del asistente conversacional (RF-01).
// Diseño ilustrado (Opción B) aprobado en revisión visual antes de implementar.
export const BeeMascot: React.FC<BeeMascotProps> = ({ size = 40 }) => {
  // Ids únicos por instancia: si se renderizan varias abejas a la vez (ej. una por
  // burbuja de chat), reutilizar ids fijos de <Defs> causa que todas terminen
  // pintando el degradado/recorte de la última instancia montada.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bodyGradId = `bodyGrad-${uid}`;
  const wingGradId = `wingGrad-${uid}`;
  const clipId = `bodyClip-${uid}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={HONEY_LIGHT} />
          <Stop offset="1" stopColor={HONEY} />
        </LinearGradient>
        <LinearGradient id={wingGradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={WING_LIGHT} />
          <Stop offset="1" stopColor={WING} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Ellipse cx="50" cy="61" rx="26" ry="22" />
        </ClipPath>
      </Defs>

      {/* Alas (detrás del cuerpo) */}
      <Ellipse cx="24" cy="44" rx="15" ry="10" fill={`url(#${wingGradId})`} opacity={0.95} transform="rotate(-24 24 44)" />
      <Ellipse cx="30" cy="50" rx="11" ry="7.5" fill={`url(#${wingGradId})`} opacity={0.8} transform="rotate(-8 30 50)" />
      <Ellipse cx="76" cy="44" rx="15" ry="10" fill={`url(#${wingGradId})`} opacity={0.95} transform="rotate(24 76 44)" />
      <Ellipse cx="70" cy="50" rx="11" ry="7.5" fill={`url(#${wingGradId})`} opacity={0.8} transform="rotate(8 70 50)" />

      {/* Antenas */}
      <Path d="M43 19 C39 10, 32 8, 28 12" stroke={STRIPE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M57 19 C61 10, 68 8, 72 12" stroke={STRIPE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Circle cx="28" cy="12" r="3" fill={HONEY_LIGHT} />
      <Circle cx="72" cy="12" r="3" fill={HONEY_LIGHT} />

      {/* Cuerpo con rayas */}
      <Ellipse cx="50" cy="61" rx="26" ry="22" fill={`url(#${bodyGradId})`} />
      <G clipPath={`url(#${clipId})`}>
        <Rect x="18" y="49" width="64" height="8" fill={STRIPE} />
        <Rect x="18" y="65" width="64" height="8" fill={STRIPE} />
      </G>

      {/* Cabeza y cara */}
      <Circle cx="50" cy="31" r="18" fill={`url(#${bodyGradId})`} />
      <Ellipse cx="36" cy="36" rx="5" ry="4" fill={BLUSH} opacity={0.65} />
      <Ellipse cx="64" cy="36" rx="5" ry="4" fill={BLUSH} opacity={0.65} />
      <Circle cx="43" cy="29" r="3.6" fill={STRIPE} />
      <Circle cx="57" cy="29" r="3.6" fill={STRIPE} />
      <Circle cx="44.3" cy="27.7" r="1.1" fill="#FFFFFF" />
      <Circle cx="58.3" cy="27.7" r="1.1" fill="#FFFFFF" />
      <Path d="M45 37 Q50 40.5 55 37" stroke={STRIPE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </Svg>
  );
};
