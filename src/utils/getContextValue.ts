const getContextValue = (context, elementContext) => {
  const parentProvider = context._providers?.get(elementContext.Provider);

  return parentProvider ? parentProvider.value : elementContext._currentValue;
};

export default getContextValue;
