import React, { useState, useEffect } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

export const RotateLandscapeOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // 📱 모바일 스마트폰/태블릿 기기 (User-Agent) 및 세로 방향(Portrait) 체크
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;

      // 실제 모바일 스마트폰 기기에서 세로 상태일 때만 오버레이 표시! (PC 데스크톱 브라우저는 100% 무시)
      setIsPortrait(isMobileDevice && portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl text-center select-none border-4 border-amber-500/50">
      <div className="relative mb-4">
        <Smartphone className="w-16 h-16 text-sky-400 animate-bounce" />
        <RotateCw className="w-8 h-8 text-amber-400 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '4s' }} />
      </div>

      <h2 className="text-xl font-black text-amber-300 mb-1">
        화면을 가로(Landscape)로 기울여 주세요
      </h2>
    </div>
  );
};
