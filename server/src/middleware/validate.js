export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      if (!result.success) {
        const errors = result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
      }
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export const validateQuery = (schema) => validate(schema, 'query');
