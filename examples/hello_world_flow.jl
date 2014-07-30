
module hello_world_flow

using Epicenter


#variables
export sampleString, sampleInt, sampleTruthy, sampleBool, sampleFalseBool, salesMgr, sales, sample2d

#operations
export saveAll, changeString, addToInt, changeTruthy, changeBool, changeObjSubfield, appendToArray, updateFirstArrayVal, subtractFromArray, resetInt, updateTwoArrayVals

global sampleString, sampleInt, sampleTruthy, sampleBool, salesMgr, sales, sample2d

type mgrType
  num_reports::Int
  name::String
  region::String
  mgrType(; num_reports = 0, name = "", region = "") = new(num_reports,name, region)
end

sampleString = "hello world flow"
sampleInt = 10
sampleTruthy = 1
sampleBool = true
sampleFalseBool = false
salesMgr = mgrType()
  salesMgr.num_reports = 2
  salesMgr.name = "John Smith"
  salesMgr.region = "West"
sales = [100, 200, 300, 400]

## run api displays this as [1,2,3,4,5,6]
sample2d = [ [1,2], [3,4], [5,6] ]


function saveAll()
   record(:sampleString)
   record(:sampleInt)
   record(:sampleTruthy)
   record(:sampleBool)
   record(:sampleFalseBool)
   record(:salesMgr)
   record(:sales)
   record(:sample2d)
end

#works w/ agg run api
function changeString(str)
  global sampleString = str
  record(:sampleString)
end

#works w/ agg run api
function addToInt(int)
  global sampleInt = sampleInt + int
  record(:sampleInt)
end

#works w/ agg run api
function changeTruthy(truthy)
  global sampleTruthy = truthy
  record(:sampleTruthy)
end

#works w/ agg run api
function changeBool(bool)
  global sampleBool = bool
  record(:sampleBool)
end

#works w/ agg run api
function changeObjSubfield(newRegion)
  global salesMgr
  salesMgr.region = newRegion
  record(:salesMgr)
end

#works w/ agg run api 
function appendToArray(val)
  global sales
  push!(sales, val)
  record(:sales, length(sales))
end

#works w/ agg run api
function updateFirstArrayVal(val)
  global sales
  sales[1] = val
  record(:sales, 1)
end

function updateTwoArrayVals(val1,val2)
  global sales
  sales[1] = val1
  sales[2] = val2
  record(:sales)
end

#works w/ agg run api
function resetInt()
  global sampleInt = 8
  record(:sampleInt)
end

#works w/ agg run api
function subtractFromArray(val)
  global sales
  for i = 1:length(sales)
    sales[i] = sales[i] - val
  end
  record(:sales)
end


end
