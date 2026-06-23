export const getVehiclePrice = (car) =>
  Number(car.price_lakh || car.price || 0);
