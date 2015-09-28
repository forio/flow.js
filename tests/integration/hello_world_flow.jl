# last update 09/28/2015


module hello_world_flow

using Epicenter


#variables
export sampleString, sampleInt, sampleTruthy, anotherTruthy, sampleBool, sampleFalseBool, salesMgr, sales, sample2d, sample64, sampleThousand, sampleMillion, sampleBillion, sampleTrillion, regions, sampleX, sampleY, sampleVar1, sampleVar2, myVariable

#operations
export saveAll, changeString, addToInt, changeTruthy, changeBool, changeObjSubfield, appendToArray, updateFirstArrayVal, subtractFromArray, resetInt, updateTwoArrayVals, addTo64, updateXY, addVar1Var2

global sampleString, sampleInt, sampleTruthy, sampleBool, sampleFalseBool, salesMgr, sales, sample2d, sample64, sampleThousand, sampleMillion, sampleBillion, sampleTrillion, regions, sampleX, sampleY, sampleVar1, sampleVar2, myVariable

type mgrType
  num_reports::Int
  name::String
  region::String
  mgrType(; num_reports = 0, name = "", region = "") = new(num_reports,name, region)
end

sampleString = "hello world flow"
sampleInt = 10
myVariable = 10
sampleTruthy = 1
anotherTruthy = 1
sampleX = 1
sampleY = 5
sampleVar1 = {1}
sampleVar2 = {2}
sampleBool = true
sampleFalseBool = false
salesMgr = mgrType()
  salesMgr.num_reports = 2
  salesMgr.name = "John Smith"
  salesMgr.region = "West"
sales = {100, 400, 300, 200}
regions = { "North", "East", "South", "West" }
sample64 = 3.14159
sampleThousand = 12468
sampleMillion = 3111246
sampleBillion = 1987654321
sampleTrillion = 100234567891431

## run api displays this as [1,2,3,4,5,6]
sample2d = [ [1,2], [3,4], [5,6] ]


function saveAll()
   record(:sampleString)
   record(:sampleInt)
   record(:sampleTruthy)
   record(:myVariable)
   record(:sampleX)
   record(:sampleY)
   record(:sampleVar1)
   record(:sampleVar2)
   record(:sampleBool)
   record(:sampleFalseBool)
   record(:salesMgr)
   record(:sales)
   record(:sample2d)
   record(:sample64)
   record(:sampleThousand)
   record(:sampleMillion)
   record(:sampleBillion)
   record(:sampleTrillion)
   record(:regions)   
end

function addVar1Var2(int1, int2)
  global sampleVar1
  global sampleVar2
  sampleVar1 = push!(sampleVar1, int1)
  sampleVar2 = push!(sampleVar2, int2)
  record(:sampleVar1)
  record(:sampleVar2)
end

function updateXY(int1, int2)
  global sampleX
  global sampleY
  sampleX = int1
  sampleY = int2
  record(:sampleX)
  record(:sampleY)
  return sampleX, sampleY
end

function addTo64(float)
  global sample64
  sample64 = sample64 + float
  record(:sample64)
end

function changeString(str)
  #global sampleString = str
  global sampleString
  sampleString = str
  record(:sampleString)
end

function addToInt(int)
  #global sampleInt = sampleInt + int
  global sampleInt
  sampleInt = sampleInt + int
  record(:sampleInt)
end

function changeTruthy(truthy)
  #global sampleTruthy = truthy
  global sampleTruthy
  sampleTruthy = truthy
  record(:sampleTruthy)
end

function changeBool(bool)
  #global sampleBool = bool
  global sampleBool
  sampleBool = bool
  record(:sampleBool)
end

function changeObjSubfield(newRegion)
  global salesMgr
  salesMgr.region = newRegion
  record(:salesMgr)
end

function appendToArray(val)
  global sales
  push!(sales, val)
  record(:sales, length(sales))
end

function updateFirstArrayVal(val)
  global sales
  sales[1] = val
  record(:sales, 1)
end

function updateTwoArrayVals(val1,val2)
  global sales
  sales[1] = sales[1] + val1
  sales[3] = sales[3] + val2
  record(:sales)
end

function resetInt()
  #global sampleInt = 8
  global sampleInt
  sampleInt = 8
  record(:sampleInt)
end

function subtractFromArray(val)
  global sales
  for i = 1:length(sales)
    sales[i] = sales[i] - val
  end
  record(:sales)
end


end
