import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type {
  ArchiveStatusVariables,
  PendingOperations,
  PendingOperationsDecision,
} from '@/shared/domain/pending-operations.schema';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { useModalTarget } from '@/shared/forms/use-modal-target';

export interface ArchiveTarget {
  uuid: string;
  name: string;
}

interface PendingArchive {
  target: ArchiveTarget;
  pendingOperations: PendingOperations;
}

interface UseArchiveWithPendingOperationsOptions<TData> {
  fetchPendingOperations: (uuid: string) => Promise<PendingOperations>;
  statusMutation: UseMutationResult<TData, Error, ArchiveStatusVariables>;
}

export const useArchiveWithPendingOperations = <TData>({
  fetchPendingOperations,
  statusMutation,
}: UseArchiveWithPendingOperationsOptions<TData>) => {
  const { showError } = useFeedbackModal();
  const dialog = useModalTarget<PendingArchive>();

  const check = useMutation({ mutationFn: fetchPendingOperations });

  const archive = (uuid: string, decision?: PendingOperationsDecision) => {
    statusMutation.mutate(
      { uuid, status: 'INACTIVE', pendingOperations: decision },
      {
        onSuccess: dialog.close,
        onError: (error) => {
          dialog.close();
          showError(error);
        },
      },
    );
  };

  const requestArchive = (target: ArchiveTarget) => {
    check.mutate(target.uuid, {
      onSuccess: (pendingOperations) => {
        if (pendingOperations.count > 0) {
          dialog.show({ target, pendingOperations });

          return;
        }

        archive(target.uuid);
      },
      onError: showError,
    });
  };

  return {
    requestArchive,
    isChecking: (uuid: string) => check.isPending && check.variables === uuid,
    dialog: {
      open: dialog.open,
      name: dialog.target?.target.name,
      pendingOperations: dialog.target?.pendingOperations,
      decision: statusMutation.isPending
        ? statusMutation.variables.pendingOperations
        : undefined,
      onDecide: (decision: PendingOperationsDecision) => {
        if (dialog.target) {
          archive(dialog.target.target.uuid, decision);
        }
      },
      onClose: dialog.close,
    },
  };
};
