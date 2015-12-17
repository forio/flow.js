module TSPSolver

#############################################################################
# A test Model
#############################################################################

using JuMP
using GLPKMathProgInterface

# some comments
# about this
# function
function function_with_nested_ends_inside(n, sol)
    tour = [1]  # Start at city 1 always
    cur_city = 1

    while true
        # Look for first arc out of current city
        for j = 1:n
            if sol[cur_city,j] >= 1-1e-6
                # Found next city
                push!(tour, j)
                # Don't ever use this arc again
                sol[cur_city, j] = 0.0
                # sol[j, cur_city] = 0.0
                # Move to next city
                cur_city = j
                break
            end
        end
        # If we have come back to 1, stop
        if cur_city == 1
            break
        end
    end  # end while
    return tour
end

function function_with_bad_indentation(n, sol)
i=2
g=4
return true
end

  function   function_with_bad_spacing(n, sol)
    return true
end

end
