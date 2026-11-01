interface Reference {
  uuid: string;
  name: string;
}

export interface ReferenceOption {
  value: string;
  label: string;
}

export const toReferenceOptions = (
  references: readonly Reference[],
  retained?: Reference | null,
): ReferenceOption[] => {
  const options = references.map(({ uuid, name }) => ({
    value: uuid,
    label: name,
  }));

  return retained && !options.some(({ value }) => value === retained.uuid)
    ? [...options, { value: retained.uuid, label: retained.name }]
    : options;
};
