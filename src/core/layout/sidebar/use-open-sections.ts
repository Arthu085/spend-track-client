import { useState } from 'react';

export const useOpenSections = (activeSectionKey: string | undefined) => {
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [revealedSectionKey, setRevealedSectionKey] = useState<string>();

  if (activeSectionKey !== revealedSectionKey) {
    setRevealedSectionKey(activeSectionKey);
    if (activeSectionKey && !openKeys.includes(activeSectionKey)) {
      setOpenKeys([...openKeys, activeSectionKey]);
    }
  }

  return { openKeys, setOpenKeys };
};
