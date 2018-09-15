module.exports.reduce2 = function(arr, func, seed) {
  const target = [];

  for (var i = 0; i < arr.length; i += 2) {
    target.push([arr[i], arr[i + 1]]);
  }

  return target.reduce(func, seed);
};
