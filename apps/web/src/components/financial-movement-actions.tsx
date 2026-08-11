'use client';

import { type ReactNode, useState } from 'react';
import {
  FinancialMovementDialogs,
  type FinancialMovementEditSurface,
  type MovementDialogProps,
} from './financial-movement-dialogs';
import { MovementActionSurface } from './movement-action-surface';
import { Button } from './ui/button';

type Movement = MovementDialogProps['movement'];

export function FinancialMovementActions({
  title,
  description,
  spaceId,
  movement,
  beforeEdit,
  afterEdit,
}: {
  title: string;
  description: string;
  spaceId: string;
  movement: Movement;
  beforeEdit?: ReactNode;
  afterEdit?: ReactNode;
}) {
  const [surface, setSurface] = useState<FinancialMovementEditSurface>(null);

  return (
    <>
      <MovementActionSurface title={title} description={description}>
        {beforeEdit}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setSurface('scope')}
        >
          Editar
        </Button>
        {afterEdit}
      </MovementActionSurface>
      <FinancialMovementDialogs
        spaceId={spaceId}
        movement={movement}
        surface={surface}
        onSurfaceChange={setSurface}
      />
    </>
  );
}
